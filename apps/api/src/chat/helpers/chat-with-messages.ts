import type { Prisma } from '../../generated/prisma/client.js';

// Oldest first, by seq (insertion order): createdAt can tie, and the uuid id is random.
export const chatWithMessagesInclude = {
  messages: { orderBy: { seq: 'asc' } },
} satisfies Prisma.ChatInclude;

export type ChatWithMessages = Prisma.ChatGetPayload<{ include: typeof chatWithMessagesInclude }>;
