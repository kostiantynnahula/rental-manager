import type { ChatStatus } from 'ai';
import type { ChatUIMessage } from '../interfaces/chat-ui-message';

// "Думаю…": waiting for the first byte, or the stream is open but nothing shows — before the answer's first
// part, or after a tool's output while the model works out its next step. A running tool has its own status
// line, and streaming text shows itself.
export function isThinking(status: ChatStatus, last: ChatUIMessage | undefined): boolean {
  if (status === 'submitted') return true;
  if (status !== 'streaming' || last?.role !== 'assistant') return false;
  const part = last.parts.at(-1);
  if (!part) return true;
  if (part.type === 'text') return false;
  if ('state' in part && (part.state === 'input-streaming' || part.state === 'input-available'))
    return false;
  return (
    part.type.startsWith('tool-') || part.type === 'dynamic-tool' || part.type === 'step-start'
  );
}
