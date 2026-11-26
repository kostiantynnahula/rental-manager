'use client';

import { useSearchParam } from '@/hooks/use-search-param';
import type { Apartment } from '@/lib/api/queries/apartments';
import { ChatConversation } from './chat-conversation';
import { ChatList } from './chat-list';
import { parseChatId } from './helpers/parse-chat-id';

// Apartment page, tab "Чат": the list, or one chat while ?chat=<id> is set (one screen at a time on a phone).
export function ApartmentChatTab({ apartment }: { apartment: Apartment }) {
  const [chatId, setChatId] = useSearchParam('chat', parseChatId, '');

  return chatId ? (
    <ChatConversation
      key={chatId}
      chatId={chatId}
      apartmentId={apartment.id}
      onBack={() => setChatId('')}
    />
  ) : (
    <ChatList apartment={apartment} onOpen={setChatId} />
  );
}
