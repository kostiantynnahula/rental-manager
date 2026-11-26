'use client';

import { ChevronLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { NotFoundState } from '@/components/not-found-state';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isNotFoundError } from '@/lib/api/api-error';
import { useChatDetail, useChats } from '@/lib/api/queries/chats';
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
  // The title from the list: it's refetched after each answer (the first question titles the chat), the detail
  // isn't (see below).
  const listed = useChats(apartmentId).data?.find((c) => c.id === chatId);
  const root = useRef<HTMLDivElement>(null);
  const loaded = detail.isSuccess;

  // The chat fills the screen below the page header (the apartment's title and tabs scroll away), so the
  // input is always on screen on a phone.
  useEffect(() => {
    if (loaded) root.current?.scrollIntoView({ block: 'start' });
  }, [loaded]);

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
    // Viewport − the sticky app header (3.5rem) − the bottom nav on a phone (5rem, main's bottom padding).
    <div
      ref={root}
      className="flex h-[calc(100dvh-3.5rem-5rem-env(safe-area-inset-bottom))] min-h-96 scroll-mt-14 flex-col gap-2 md:h-[calc(100dvh-3.5rem-1.5rem)]"
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        {back}
        <h2 className="min-w-0 truncate font-medium">
          {(listed ? listed.title : detail.data.title) ?? UNTITLED_CHAT}
        </h2>
      </div>
      {/* Remounted when the history is refetched (reopening an invalidated chat): useChat takes its initial messages
          only once. useChatDetail never refetches on its own, and onFinish only marks it stale. */}
      <ChatSession
        key={detail.dataUpdatedAt}
        chatId={chatId}
        apartmentId={apartmentId}
        history={detail.data.messages}
      />
    </div>
  );
}
