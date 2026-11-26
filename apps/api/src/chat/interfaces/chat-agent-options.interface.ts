import type { ChatAnthropic } from '@langchain/anthropic';
import type { ChatToolDeps } from '../agent/chat-tools.js';
import type { ChatRunContext } from './chat-run-context.interface.js';

// One agent run's setup (buildChatAgent).
export interface ChatAgentOptions {
  model: ChatAnthropic;
  ctx: ChatRunContext;
  deps: ChatToolDeps;
  apartmentName: string;
  maxToolCalls: number;
}
