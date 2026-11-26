'use client';

import { ChevronLeft } from 'lucide-react';
import { NotFoundState } from '@/components/not-found-state';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isNotFoundError } from '@/lib/api/api-error';
import { useChatDetail } from '@/lib/api/queries/chats';
import { ChatSession } from './chat-session';
import { UNTITLED_CHAT } from './constants/chat';

// One chat: its history from GET /chats/:id, then the live conversation (ChatSession).
export function ChatConversation({
  chatId,
  apartmentId,
  onBack,
}: {
  chatId: string;
  apartmentId: string;
  onBack: () => void;
}) {
  const detail = useChatDetail(chatId);

  const back = (
    <Button variant="ghost" className="-ml-3" onClick={onBack}>
      <ChevronLeft />
      Чати
    </Button>
  );

  if (detail.isPending) {
    return (
      <div className="space-y-3">
        {back}
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="ml-auto h-10 w-1/2" />
      </div>
    );
  }
  if (detail.isError) {
    return isNotFoundError(detail.error) ? (
      <NotFoundState
        title="Чат не знайдено"
        backHref={`/apartments/${apartmentId}?tab=chat`}
        backLabel="До списку чатів"
      />
    ) : (
      <div className="space-y-3">
        {back}
        <QueryError error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex min-w-0 items-center gap-2">
        {back}
        <h2 className="min-w-0 truncate font-medium">{detail.data.title ?? UNTITLED_CHAT}</h2>
      </div>
      {/* Remounted when the history is refetched (opening a chat whose cache is stale): useChat takes its
          initial messages only once. Nothing refetches it mid-answer (no window-focus refetch, onFinish only
          marks it stale). */}
      <ChatSession
        key={detail.dataUpdatedAt}
        chatId={chatId}
        apartmentId={apartmentId}
        history={detail.data.messages}
      />
    </div>
  );
}
