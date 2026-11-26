'use client';

import { MessageSquarePlus } from 'lucide-react';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { applyApiError } from '@/lib/api/api-error';
import type { Apartment } from '@/lib/api/queries/apartments';
import { useChats, useCreateChat } from '@/lib/api/queries/chats';
import { ChatListItem } from './chat-list-item';

// Last active first. A new chat opens right away (it gets its title from the first question).
export function ChatList({
  apartment,
  onOpen,
}: {
  apartment: Apartment;
  onOpen: (chatId: string) => void;
}) {
  const chats = useChats(apartment.id);
  const create = useCreateChat(apartment.id);

  function startChat() {
    create.mutate(undefined, {
      onSuccess: (chat) => onOpen(chat.id),
      onError: (error) =>
        applyApiError(error, {
          messages: { 404: 'Квартира в архіві: новий чат створити не можна' },
        }),
    });
  }

  return (
    <div className="space-y-4">
      {/* The API answers 404 for an archived apartment; its old chats can still be read. */}
      {apartment.isActive && (
        <Button onClick={startChat} disabled={create.isPending}>
          <MessageSquarePlus />
          {create.isPending ? 'Створення…' : 'Новий чат'}
        </Button>
      )}

      {chats.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : chats.isError ? (
        <QueryError error={chats.error} onRetry={() => void chats.refetch()} />
      ) : chats.data.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-muted-foreground">
          Чатів ще немає. Запитайте, наприклад: «що з холодильником?»
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {chats.data.map((chat) => (
            <ChatListItem key={chat.id} chat={chat} onOpen={() => onOpen(chat.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}
