import type { CallbackHandlerMethods } from '@langchain/core/callbacks/base';
import { createAgent, toolCallLimitMiddleware } from 'langchain';
import { todayDateOnly } from '../../common/helpers/date-only.js';
import { llmResultUsage } from '../helpers/run-usage.js';
import { chatSystemPrompt } from '../helpers/system-prompt.js';
import type { ChatAgentOptions } from '../interfaces/chat-agent-options.interface.js';
import type { ChatRunContext } from '../interfaces/chat-run-context.interface.js';
import { buildChatTools } from './chat-tools.js';

// One agent run's setup, shared by the chat route (ChatAgentService) and the chat:debug CLI, so the CLI runs
// exactly the agent the web gets.

export function newRunContext(apartmentId: string, fail: (error: unknown) => void): ChatRunContext {
  return {
    apartmentId,
    photoIds: new Set(),
    toolCalls: [],
    usage: { inputTokens: 0, outputTokens: 0 },
    fail,
  };
}

export function buildChatAgent({
  model,
  ctx,
  deps,
  apartmentName,
  maxToolCalls,
}: ChatAgentOptions) {
  return createAgent({
    model,
    tools: buildChatTools(ctx, deps),
    systemPrompt: chatSystemPrompt({ apartmentName, today: todayDateOnly() }),
    // 'continue': a call past the limit gets an error message, and the model answers with what it has.
    middleware: [toolCallLimitMiddleware({ runLimit: maxToolCalls, exitBehavior: 'continue' })],
  });
}

// Per model call, so a failed or aborted run still counts what it spent.
export function usageCallback(ctx: ChatRunContext): CallbackHandlerMethods {
  return {
    handleLLMEnd: (result) => {
      const usage = llmResultUsage(result);
      ctx.usage.inputTokens += usage.inputTokens;
      ctx.usage.outputTokens += usage.outputTokens;
    },
  };
}
