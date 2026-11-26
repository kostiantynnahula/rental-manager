import type { Prisma } from '../../generated/prisma/client.js';

// Oldest first: the order they were said in. id breaks a createdAt tie (stable order).
export const chatWithMessagesInclude = {
  messages: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.ChatInclude;

export type ChatWithMessages = Prisma.ChatGetPayload<{ include: typeof chatWithMessagesInclude }>;
