'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { applyApiError } from '@/lib/api/api-error';
import type { ChatListItem, useRenameChat } from '@/lib/api/queries/chats';
import { CHAT_TITLE_MAX_LENGTH } from './constants/chat';

// One field, so no RHF: blank → null ("Без назви"), the same rule the API applies.
export function RenameChatForm({
  chat,
  rename,
  onDone,
}: {
  chat: ChatListItem;
  rename: ReturnType<typeof useRenameChat>;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(chat.title ?? '');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    rename.mutate(trimmed === '' ? null : trimmed, {
      onSuccess: () => {
        toast.success('Чат перейменовано');
        onDone();
      },
      onError: (error) => applyApiError(error, { messages: { 404: 'Чат уже видалено' } }),
    });
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Перейменувати чат</DialogTitle>
        <DialogDescription>Порожня назва — «Без назви».</DialogDescription>
      </DialogHeader>
      <Field>
        <FieldLabel htmlFor={`chat-title-${chat.id}`}>Назва</FieldLabel>
        <Input
          id={`chat-title-${chat.id}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={CHAT_TITLE_MAX_LENGTH}
          autoComplete="off"
        />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={rename.isPending}>
          Скасувати
        </Button>
        <Button type="submit" disabled={rename.isPending}>
          {rename.isPending ? 'Збереження…' : 'Зберегти'}
        </Button>
      </DialogFooter>
    </form>
  );
}
