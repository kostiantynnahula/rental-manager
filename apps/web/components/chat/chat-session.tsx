'use client';

import { useChat } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport } from 'ai';
import { useMemo } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Loader } from '@/components/ai-elements/loader';
import { chatFetch } from '@/lib/api/chat-fetch';
import { chatKeys, type ChatStoredMessage } from '@/lib/api/queries/chats';
import { ChatInput } from './chat-input';
import { ChatMessageView } from './chat-message-view';
import { chatErrorMessage } from './helpers/chat-error-message';
import { isThinking } from './helpers/is-thinking';
import { toUIMessages } from './helpers/to-ui-messages';
import type { ChatUIMessage } from './interfaces/chat-ui-message';

// The live conversation. The API owns the history, so only the new message is sent (api-chat.md).
export function ChatSession({
  chatId,
  apartmentId,
  history,
}: {
  chatId: string;
  apartmentId: string;
  history: ChatStoredMessage[];
}) {
  const queryClient = useQueryClient();
  const transport = useMemo(
    () =>
      new DefaultChatTransport<ChatUIMessage>({
        api: `/api/chats/${chatId}/messages`,
        credentials: 'same-origin',
        fetch: chatFetch,
        prepareSendMessagesRequest: ({ messages }) => ({ body: { message: messages.at(-1) } }),
      }),
    [chatId],
  );
  const initialMessages = useMemo(() => toUIMessages(history), [history]);

  const { messages, sendMessage, status, stop, error, clearError } = useChat<ChatUIMessage>({
    id: chatId,
    messages: initialMessages,
    transport,
    onFinish: () => {
      // The first question titles the chat and every answer bumps updatedAt (the list's order).
      void queryClient.invalidateQueries({ queryKey: chatKeys.lists() });
      // Stale, not refetched: a refetch would remount this session (see ChatConversation).
      void queryClient.invalidateQueries({
        queryKey: chatKeys.detail(chatId),
        refetchType: 'none',
      });
    },
  });

  const busy = status === 'submitted' || status === 'streaming';
  const thinking = isThinking(status, messages.at(-1));

  function send(text: string) {
    clearError();
    void sendMessage({ text });
  }

  return (
    // Fills ChatConversation; the messages scroll inside, the input stays at the bottom.
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
      <Conversation>
        <ConversationContent className="gap-4 p-3">
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Запитайте про стан квартири: «що з холодильником?», «які зміни після останнього
              виїзду?»
            </p>
          )}
          {messages.map((message, i) => (
            <ChatMessageView
              key={message.id}
              message={message}
              apartmentId={apartmentId}
              streaming={status === 'streaming' && i === messages.length - 1}
            />
          ))}
          {thinking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader />
              Думаю…
            </div>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive"
            >
              {chatErrorMessage(error)}
            </p>
          )}
        </ConversationContent>
        <ConversationScrollButton aria-label="Прокрутити донизу" />
      </Conversation>
      <ChatInput busy={busy} onSend={send} onStop={() => void stop()} />
    </div>
  );
}
