import type { UIMessage } from 'ai';
import type { ChatMessage } from '../../generated/prisma/client.js';
import { ChatRole } from '../../generated/prisma/enums.js';

// Stored rows (oldest first) → the model's history. Text parts only: data-sources is for the web, and no tool parts
// are stored. Starts at a question: a last-N window of alternating turns can begin with an answer, and the model's
// conversation must open with the user.
export function toHistory(rows: ChatMessage[]): UIMessage[] {
  const first = rows.findIndex((row) => row.role === ChatRole.USER);
  return (first === -1 ? [] : rows.slice(first)).map((row) => ({
    id: row.id,
    role: row.role === ChatRole.USER ? 'user' : 'assistant',
    parts: (Array.isArray(row.parts) ? row.parts : [])
      .filter(
        (p): p is { type: 'text'; text: string } =>
          typeof p === 'object' &&
          p !== null &&
          !Array.isArray(p) &&
          p.type === 'text' &&
          typeof p.text === 'string',
      )
      .map(({ text }) => ({ type: 'text', text })),
  }));
}
