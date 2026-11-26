import type { Prisma } from '../../generated/prisma/client.js';

// The list shows how many messages a chat has without loading them.
export const chatListItemInclude = {
  _count: { select: { messages: true } },
} satisfies Prisma.ChatInclude;

export type ChatListItem = Prisma.ChatGetPayload<{ include: typeof chatListItemInclude }>;
