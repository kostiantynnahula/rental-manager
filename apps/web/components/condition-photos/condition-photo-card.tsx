'use client';

import { Eye, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ApiImage } from '@/components/photos/api-image';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ConditionPhoto } from '@/lib/api/queries/condition-photos';
import { formatDate } from '@/lib/format';
import { EVENT_LABELS } from './constants/events';
import { DeleteConditionPhotoDialog } from './delete-condition-photo-dialog';
import { EditConditionPhotoSheet } from './edit-condition-photo-sheet';

type Panel = 'edit' | 'delete' | null;

// Thumbnail (tap → lightbox), the note, and a ⋯ menu: view (the photo's page) / edit / delete.
export function ConditionPhotoCard({
  photo,
  onOpen,
}: {
  photo: ConditionPhoto;
  onOpen: () => void;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const close = (open: boolean) => !open && setPanel(null);
  const label = `${EVENT_LABELS[photo.event]}, ${formatDate(photo.takenOn)}`;

  return (
    <li className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Відкрити фото: ${label}`}
        className="block aspect-square bg-muted"
      >
        <ApiImage src={photo.thumbnailUrl} alt={label} className="size-full object-cover" />
      </button>
      <div className="flex flex-1 items-start justify-between gap-1 pl-3">
        <p className="line-clamp-2 py-2 text-sm break-words text-muted-foreground">
          {photo.note ?? ''}
        </p>
        {/* Non-modal: a Sheet/Dialog opened from an item would otherwise fight the menu over focus. */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Дії: ${label}`} className="shrink-0">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* The photo's page: zoom, lease, and the description / items editor. */}
            <DropdownMenuItem asChild>
              <Link href={`/apartments/${photo.apartmentId}/condition-photos/${photo.id}`}>
                <Eye />
                Переглянути
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setPanel('edit')}>
              <Pencil />
              Редагувати
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => setPanel('delete')}>
              <Trash2 />
              Видалити
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <EditConditionPhotoSheet photo={photo} open={panel === 'edit'} onOpenChange={close} />
      <DeleteConditionPhotoDialog photo={photo} open={panel === 'delete'} onOpenChange={close} />
    </li>
  );
}
