import type { ChatStoredMessage } from '@/lib/api/queries/chats';
import type { ChatUIMessage } from '../interfaces/chat-ui-message';

// Stored rows (GET /chats/:id) → useChat's initial messages. `parts` are AI SDK UIMessage parts already (written only
// by the API: text + data-sources), so they're passed through.
export function toUIMessages(messages: ChatStoredMessage[]): ChatUIMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role === 'USER' ? 'user' : 'assistant',
    parts: m.parts as ChatUIMessage['parts'],
  }));
}
