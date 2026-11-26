'use client';

import { isDynamicToolUIPart, isToolUIPart } from 'ai';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { ChatAnswerText } from './chat-answer-text';
import { ChatSources } from './chat-sources';
import { ToolStatus } from './tool-status';
import type { ChatUIMessage } from './interfaces/chat-ui-message';

// A question (plain text) or an answer: text with photo chips, a status line per running tool, the sources row.
export function ChatMessageView({
  message,
  apartmentId,
  streaming,
}: {
  message: ChatUIMessage;
  apartmentId: string;
  streaming: boolean;
}) {
  if (message.role === 'user') {
    const text = message.parts.map((p) => (p.type === 'text' ? p.text : '')).join('');
    return (
      <Message from="user">
        <MessageContent className="whitespace-pre-wrap break-words">{text}</MessageContent>
      </Message>
    );
  }

  return (
    <Message from="assistant">
      <MessageContent className="w-full">
        {message.parts.map((part, i) => {
          if (part.type === 'text') {
            return <ChatAnswerText key={i} text={part.text} apartmentId={apartmentId} />;
          }
          if (isDynamicToolUIPart(part) || isToolUIPart(part)) {
            // Only while the answer streams: a finished tool call says nothing the answer doesn't.
            return streaming ? <ToolStatus key={i} part={part} /> : null;
          }
          if (part.type === 'data-sources') {
            return <ChatSources key={i} photoIds={part.data.photoIds} apartmentId={apartmentId} />;
          }
          return null;
        })}
      </MessageContent>
    </Message>
  );
}
