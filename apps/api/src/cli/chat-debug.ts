// Runs the apartment chat agent once, without a chat: what it called, with what args, what came back. Run from the
// repo root:
//   pnpm --filter api chat:debug -- --apartment <id|name> "<question>"
// --apartment: see findApartment. Builds first (Nest DI needs decorator metadata). Needs ANTHROPIC_API_KEY,
// VOYAGE_API_KEY (search) and Redis up (the condition-photos module's queues). Paid: one agent run.
// Nothing is saved: no chat, no messages. The same agent as the route (buildChatAgent), with a single question and
// no history.
import { parseArgs } from 'node:util';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { buildChatAgent, newRunContext, usageCallback } from '../chat/agent/chat-agent.js';
import { chatModel } from '../chat/agent/chat-model.js';
import { questionText } from '../chat/helpers/question.js';
import type { ChatToolCall } from '../chat/interfaces/chat-tool-call.interface.js';
import { citedIds, sourcesInOrder, stripUnknownMarkers } from '../chat/helpers/sources.js';
import { ConditionPhotosService } from '../condition-photos/condition-photos.service.js';
import type { Env } from '../config/env.validation.js';
import { LeasesService } from '../leases/leases.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChatDebugModule } from './chat-debug.module.js';
import { findApartment } from './helpers/find-apartment.js';

const USAGE = `Usage:
  chat:debug --apartment <id|name> "<question>"`;

interface Args {
  apartment: string;
  question: string;
}

function parse(argv: string[]): Args {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { apartment: { type: 'string' } },
  });
  if (!values.apartment || positionals.length === 0) {
    throw new Error(`--apartment and a question are required.\n${USAGE}`);
  }
  // The route's limits (1–2000 chars once trimmed); its 400 message reads fine here.
  return { apartment: values.apartment, question: questionText([{ text: positionals.join(' ') }]) };
}

async function main(): Promise<void> {
  // pnpm may pass a literal `--` through before the script's own args.
  const argv = process.argv.slice(2).filter((a, i) => !(i === 0 && a === '--'));
  const args = parse(argv);
  const app = await NestFactory.createApplicationContext(ChatDebugModule, {
    logger: ['error', 'warn'],
  });
  try {
    const config = app.get<ConfigService<Env, true>>(ConfigService);
    const model = chatModel(config);
    if (!model) throw new Error('ANTHROPIC_API_KEY is not set');
    const apartment = await findApartment(app.get(PrismaService), args.apartment);

    const abort = new AbortController();
    let fatal: unknown;
    const ctx = newRunContext(apartment.id, (error) => {
      fatal ??= error;
      abort.abort();
    });
    const agent = buildChatAgent({
      model,
      ctx,
      deps: { conditionPhotos: app.get(ConditionPhotosService), leases: app.get(LeasesService) },
      apartmentName: apartment.name,
      maxToolCalls: config.get('CHAT_MAX_TOOL_CALLS', { infer: true }),
    });

    console.log(`${apartment.name} — "${args.question}"`);
    const started = performance.now();
    let messages: unknown[] = [];
    try {
      const result = await agent.invoke(
        { messages: [new HumanMessage(args.question)] },
        { signal: abort.signal, callbacks: [usageCallback(ctx)] },
      );
      messages = result.messages;
    } catch (error) {
      // A tool's fatal failure (search down) aborts the run: its cause beats the abort error.
      throw fatal ?? error;
    } finally {
      printToolCalls(messages, ctx.toolCalls);
      const { inputTokens, outputTokens } = ctx.usage;
      console.log(
        `\n${Math.round(performance.now() - started)}ms; tokens in=${inputTokens} out=${outputTokens}`,
      );
    }

    const ai = messages.filter((m) => AIMessage.isInstance(m));
    const texts = ai.map((m) => m.text).filter((t) => t.trim());
    const kept = sourcesInOrder(texts, ctx.photoIds);
    const stripped = citedIds(texts).filter((id) => !kept.includes(id));
    console.log(
      `\nAnswer:\n${texts.map((t) => stripUnknownMarkers(t, ctx.photoIds)).join('\n\n')}`,
    );
    console.log(`\nPhotos kept: ${kept.length ? kept.join(', ') : 'none'}`);
    if (stripped.length) console.log(`Photos stripped: ${stripped.join(', ')}`);
  } finally {
    await app.close();
  }
}

// Args from the model's tool calls, count/ms from the tools themselves (ctx.toolCalls, in finish order), matched by
// name and order. Parallel calls of one tool may finish out of order and swap their counts: fine for a debug view.
function printToolCalls(messages: unknown[], toolCalls: ChatToolCall[]): void {
  const calls = messages.filter((m) => AIMessage.isInstance(m)).flatMap((m) => m.tool_calls ?? []);
  const results = new Map<string, typeof toolCalls>();
  for (const call of toolCalls) results.set(call.name, [...(results.get(call.name) ?? []), call]);
  const rows = calls.map((call) => {
    const done = results.get(call.name)?.shift();
    return {
      name: call.name,
      args: JSON.stringify(call.args),
      // No result: past CHAT_MAX_TOOL_CALLS (the middleware answers it) or the run ended first.
      count: done ? (done.count ?? 'error') : '—',
      ms: done?.ms ?? '—',
    };
  });
  // Results without a model message: a failed run (invoke threw, so no messages) still shows what ran and failed.
  for (const left of results.values()) {
    for (const done of left) {
      rows.push({ name: done.name, args: '—', count: done.count ?? 'error', ms: done.ms });
    }
  }
  if (rows.length === 0) {
    console.log('\nTool calls: none');
    return;
  }
  console.log('\nTool calls:');
  console.table(rows);
}

try {
  await main();
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}
