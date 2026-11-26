import type { UIMessage } from 'ai';
import type { ChatMessage } from '../../generated/prisma/client.js';
import { ChatRole } from '../../generated/prisma/enums.js';

// Stored rows → the model's history. Text parts only: data-sources is for the web, and no tool parts are stored.
export function toHistory(rows: ChatMessage[]): UIMessage[] {
  return rows.map((row) => ({
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
