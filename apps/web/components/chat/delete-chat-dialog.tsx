'use client';

import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { applyApiError } from '@/lib/api/api-error';
import { useDeleteChat, type ChatListItem } from '@/lib/api/queries/chats';

interface DeleteChatDialogProps {
  chat: ChatListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// The messages go with the chat (cascade); the photos it cited stay.
export function DeleteChatDialog({ chat, open, onOpenChange }: DeleteChatDialogProps) {
  const remove = useDeleteChat(chat.id);

  function confirm() {
    remove.mutate(undefined, {
      onSuccess: () => toast.success('Чат видалено'),
      onError: (error) => applyApiError(error, { messages: { 404: 'Чат уже видалено' } }),
      onSettled: () => onOpenChange(false),
    });
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Видалити чат?"
      description="Чат і всі його повідомлення буде видалено назавжди. Фото залишаться."
      confirmLabel="Видалити"
      destructive
      pending={remove.isPending}
      onConfirm={confirm}
    />
  );
}
