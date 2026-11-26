'use client';

import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ChatListItem as Chat } from '@/lib/api/queries/chats';
import { formatInstantDate } from '@/lib/format';
import { UNTITLED_CHAT } from './constants/chat';
import { DeleteChatDialog } from './delete-chat-dialog';
import { RenameChatDialog } from './rename-chat-dialog';

type Panel = 'rename' | 'delete' | null;

// A row: tap → the chat; ⋯ → rename / delete.
export function ChatListItem({ chat, onOpen }: { chat: Chat; onOpen: () => void }) {
  const [panel, setPanel] = useState<Panel>(null);
  const close = (open: boolean) => !open && setPanel(null);
  const title = chat.title ?? UNTITLED_CHAT;

  return (
    <li className="flex items-center gap-1 pr-1">
      <button
        type="button"
        onClick={onOpen}
        className="min-h-14 min-w-0 flex-1 px-4 py-2 text-left hover:bg-muted/50"
      >
        <span
          className={
            chat.title ? 'block truncate font-medium' : 'block truncate text-muted-foreground'
          }
        >
          {title}
        </span>
        <span className="block text-sm text-muted-foreground">
          {formatInstantDate(chat.updatedAt)} · повідомлень: {chat.messageCount}
        </span>
      </button>
      {/* Non-modal: a Dialog opened from an item would otherwise fight the menu over focus. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Дії: ${title}`} className="shrink-0">
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => setPanel('rename')}>
            <Pencil />
            Перейменувати
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setPanel('delete')}>
            <Trash2 />
            Видалити
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameChatDialog chat={chat} open={panel === 'rename'} onOpenChange={close} />
      <DeleteChatDialog chat={chat} open={panel === 'delete'} onOpenChange={close} />
    </li>
  );
}
