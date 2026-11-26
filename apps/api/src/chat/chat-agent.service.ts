import { toBaseMessages, toUIMessageStream } from '@ai-sdk/langchain';
import type { ChatAnthropic } from '@langchain/anthropic';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createUIMessageStream,
  pipeUIMessageStreamToResponse,
  type UIMessage,
  type UIMessageChunk,
} from 'ai';
import type { Response } from 'express';
import { ConditionPhotosService } from '../condition-photos/condition-photos.service.js';
import type { Env } from '../config/env.validation.js';
import type { Prisma } from '../generated/prisma/client.js';
import { ChatRole } from '../generated/prisma/enums.js';
import { LeasesService } from '../leases/leases.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { chatModel } from './agent/chat-model.js';
import { buildChatAgent, newRunContext, usageCallback } from './agent/chat-agent.js';
import { CHAT_TITLE_FROM_QUESTION_LENGTH } from './constants/chat-agent.js';
import { SendChatMessageDto } from './dto/send-chat-message.dto.js';
import { toHistory } from './helpers/history.js';
import { questionText } from './helpers/question.js';
import { photoMarkerFilter, sourcesInOrder } from './helpers/sources.js';
import { titleFromQuestion } from './helpers/title.js';
import type { ChatRunContext } from './interfaces/chat-run-context.interface.js';

// Shown for any failed run; the cause goes to the log only (it may name the provider, a key problem, a stack).
const RUN_FAILED_TEXT = 'Не вдалося отримати відповідь. Спробуйте ще раз.';

@Injectable()
export class ChatAgentService {
  private readonly logger = new Logger(ChatAgentService.name);
  // One run per chat at a time. In-process: one API process, and a restart ends the run anyway.
  private readonly running = new Set<string>();
  private readonly model: ChatAnthropic | null;
  private readonly historyLimit: number;
  private readonly maxToolCalls: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly conditionPhotos: ConditionPhotosService,
    private readonly leases: LeasesService,
    config: ConfigService<Env, true>,
  ) {
    this.model = chatModel(config);
    this.historyLimit = config.get('CHAT_HISTORY_LIMIT', { infer: true });
    this.maxToolCalls = config.get('CHAT_MAX_TOOL_CALLS', { infer: true });
  }

  // Every check that answers with an HTTP error runs before the first byte; after it, failures are an error part.
  async send(chatId: string, dto: SendChatMessageDto, res: Response): Promise<void> {
    const question = questionText(dto.message.parts);
    if (this.running.has(chatId)) {
      throw new ConflictException('An answer in this chat is still being written');
    }
    this.running.add(chatId);
    try {
      // An archived apartment's chat still answers: its history stays useful (e.g. after check-out).
      const chat = await this.prisma.chat.findUnique({
        where: { id: chatId },
        include: { apartment: { select: { name: true } } },
      });
      if (!chat) throw new NotFoundException('Chat not found');
      const model = this.model;
      if (!model) throw new ServiceUnavailableException('The chat agent is not configured');

      // Saved first: a failed run leaves the question without an answer, and it can be asked again.
      await this.saveMessage(chatId, ChatRole.USER, [{ type: 'text', text: question }], {
        ...(chat.title === null && {
          title: titleFromQuestion(question, CHAT_TITLE_FROM_QUESTION_LENGTH),
        }),
      });
      const rows = await this.prisma.chatMessage.findMany({
        where: { chatId },
        orderBy: { seq: 'desc' },
        take: this.historyLimit,
      });
      await this.run(
        chat.id,
        chat.apartmentId,
        chat.apartment.name,
        toHistory(rows.reverse()),
        model,
        res,
      );
    } finally {
      this.running.delete(chatId);
    }
  }

  private async run(
    chatId: string,
    apartmentId: string,
    apartmentName: string,
    history: UIMessage[],
    model: ChatAnthropic,
    res: Response,
  ): Promise<void> {
    const started = performance.now();
    const abort = new AbortController();
    // The client went away: stop the model (and its token spend). No answer is saved.
    res.on('close', () => {
      if (!res.writableFinished) abort.abort();
    });
    let fatal: unknown;
    const ctx = newRunContext(apartmentId, (error) => {
      fatal ??= error;
      abort.abort();
    });
    const agent = buildChatAgent({
      model,
      ctx,
      deps: { conditionPhotos: this.conditionPhotos, leases: this.leases },
      apartmentName,
      maxToolCalls: this.maxToolCalls,
    });
    let outcome: 'answered' | 'failed' = 'failed';
    // Settled when execute is over. The pipe returns as soon as the client disconnects, while the run may still be
    // unwinding: the lock (released by send) and the log wait for this.
    let executeDone!: () => void;
    const executed = new Promise<void>((resolve) => (executeDone = resolve));

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        try {
          const graph = await agent.stream(
            { messages: await toBaseMessages(history) },
            {
              streamMode: ['values', 'messages'],
              signal: abort.signal,
              callbacks: [usageCallback(ctx)],
            },
          );
          const chunks = toUIMessageStream(graph, { sendFinish: false }).pipeThrough(
            photoMarkerFilter(ctx.photoIds),
          );

          const texts = new Map<string, string>();
          let failed = false;
          for await (const chunk of chunks) {
            // The adapter's error part carries the raw cause: replaced by RUN_FAILED_TEXT (onError below).
            if (chunk.type === 'error') {
              failed = true;
              continue;
            }
            if (chunk.type === 'text-delta') {
              texts.set(chunk.id, (texts.get(chunk.id) ?? '') + chunk.delta);
            }
            writer.write(chunk);
          }
          if (failed || abort.signal.aborted) throw fatal ?? new Error('The agent run failed');

          const text = [...texts.values()].filter((t) => t.trim());
          const sources = {
            type: 'data-sources',
            data: { photoIds: sourcesInOrder(text, ctx.photoIds) },
          } as const;
          writer.write(sources as UIMessageChunk);
          // Saved before `finish`: a client that reloads the chat on finish sees the answer.
          await this.saveMessage(chatId, ChatRole.ASSISTANT, [
            ...text.map((t) => ({ type: 'text', text: t })),
            sources,
          ]);
          outcome = 'answered';
          writer.write({ type: 'finish' });
        } finally {
          executeDone();
        }
      },
      onError: (error) => {
        fatal ??= error;
        return RUN_FAILED_TEXT;
      },
    });

    try {
      await pipeUIMessageStreamToResponse({ response: res, stream });
    } finally {
      // Even when the pipe fails: the close handler aborts the run, so execute ends.
      await executed;
      this.logRun(chatId, outcome, ctx, performance.now() - started, fatal);
    }
  }

  // The message, the title (first question) and the chat's activity (updatedAt orders the list) in one transaction.
  private async saveMessage(
    chatId: string,
    role: ChatRole,
    parts: Prisma.InputJsonObject[],
    chatData: Prisma.ChatUpdateInput = {},
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.chatMessage.create({ data: { chatId, role, parts } }),
      this.prisma.chat.update({
        where: { id: chatId },
        data: { ...chatData, updatedAt: new Date() },
      }),
    ]);
  }

  // Never the question or the answer text (an error's message is the provider's/our own, never the user's).
  private logRun(
    chatId: string,
    outcome: 'answered' | 'failed',
    ctx: ChatRunContext,
    ms: number,
    error: unknown,
  ): void {
    const tools = ctx.toolCalls.map((t) => `${t.name}=${t.count ?? 'error'}/${t.ms}ms`).join(' ');
    const { inputTokens, outputTokens } = ctx.usage;
    const line =
      `chat ${chatId} ${outcome} in ${Math.round(ms)}ms; tools: ${tools || 'none'}; ` +
      `tokens in=${inputTokens} out=${outputTokens}`;
    if (outcome === 'answered') this.logger.log(line);
    else
      this.logger.warn(
        `${line}; cause: ${error instanceof Error ? `${error.name}: ${error.message}` : 'unknown'}`,
      );
  }
}
