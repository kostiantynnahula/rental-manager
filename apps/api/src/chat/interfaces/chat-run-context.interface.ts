import type { ChatToolCall } from './chat-tool-call.interface.js';

// Shared by one run's tools and the service that streams it.
export interface ChatRunContext {
  apartmentId: string;
  // Every photo id a tool returned in this run: the only ids an answer may cite.
  photoIds: Set<string>;
  toolCalls: ChatToolCall[];
  // A failure that must end the run (search down) rather than go back to the model as a tool error.
  fail(error: unknown): void;
}
