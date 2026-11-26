'use client';

import { SendHorizontal, Square } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CHAT_MESSAGE_MAX_LENGTH } from './constants/chat';

// The question box. Enter sends with a mouse/keyboard; on a touch screen Enter is a new line (the button sends).
// While an answer streams the button stops it (the API saves no answer then).
export function ChatInput({
  busy,
  onSend,
  onStop,
}: {
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [text, setText] = useState('');
  const canSend = !busy && text.trim() !== '';

  function submit(event?: React.FormEvent) {
    event?.preventDefault();
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    event.preventDefault();
    submit();
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2 border-t p-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ваше питання"
        aria-label="Питання"
        maxLength={CHAT_MESSAGE_MAX_LENGTH}
        rows={1}
        className="max-h-40 min-h-11 resize-none md:min-h-8"
      />
      {busy ? (
        <Button type="button" variant="outline" size="icon" onClick={onStop} aria-label="Зупинити">
          <Square />
        </Button>
      ) : (
        <Button type="submit" size="icon" disabled={!canSend} aria-label="Надіслати">
          <SendHorizontal />
        </Button>
      )}
    </form>
  );
}
