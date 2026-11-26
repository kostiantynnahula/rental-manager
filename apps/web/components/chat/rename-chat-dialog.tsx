'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useRenameChat, type ChatListItem } from '@/lib/api/queries/chats';
import { RenameChatForm } from './rename-chat-form';

interface RenameChatDialogProps {
  chat: ChatListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Opened from the row's ⋯ menu (controlled, no trigger).
export function RenameChatDialog({ chat, open, onOpenChange }: RenameChatDialogProps) {
  const rename = useRenameChat(chat.id);

  return (
    <Dialog open={open} onOpenChange={(next) => !rename.isPending && onOpenChange(next)}>
      <DialogContent>
        {/* Inside the content, which unmounts on close: every open starts from the current title. */}
        <RenameChatForm chat={chat} rename={rename} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
