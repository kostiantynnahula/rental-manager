'use client';

import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Photo } from '@/lib/api/queries/photos';
import { formatInstantDate } from '@/lib/format';
import { ApiImage } from './api-image';
import { PHOTO_IN_USE_REASON } from './constants/messages';
import { PARSE_STATUS_BADGES } from './constants/parse-statuses';
import { DeletePhotoDialog } from './delete-photo-dialog';

// Thumbnail → the review screen; delete only while the photo isn't used (canDelete comes from the API).
export function PhotoCard({ photo }: { photo: Photo }) {
  const [confirming, setConfirming] = useState(false);
  const date = formatInstantDate(photo.createdAt);
  const reasonId = `photo-${photo.id}-reason`;
  // One badge: the parse state while it matters, else "used".
  const parseBadge = photo.parseStatus && PARSE_STATUS_BADGES[photo.parseStatus];

  // aria-disabled instead of disabled: a tap still explains why (a title tooltip never shows on a phone).
  function handleDelete() {
    if (photo.canDelete) setConfirming(true);
    else toast.info(PHOTO_IN_USE_REASON);
  }

  return (
    <li className="overflow-hidden rounded-lg border bg-card">
      <Link
        href={`/apartments/${photo.apartmentId}/photos/${photo.id}`}
        className="relative block aspect-square bg-muted"
      >
        <ApiImage
          src={photo.thumbnailUrl}
          alt={`Фото від ${date}`}
          className="size-full object-cover"
        />
        {parseBadge ? (
          <Badge
            variant={photo.parseStatus === 'PENDING' ? 'secondary' : 'destructive'}
            className="absolute top-2 left-2 bg-background/90"
          >
            {parseBadge}
          </Badge>
        ) : (
          !photo.canDelete && (
            <Badge variant="secondary" className="absolute top-2 left-2">
              Використано
            </Badge>
          )
        )}
      </Link>
      <div className="flex items-center justify-between gap-1 pl-3">
        <span className="text-sm text-muted-foreground">{date}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Видалити фото від ${date}`}
          aria-describedby={photo.canDelete ? undefined : reasonId}
          aria-disabled={!photo.canDelete}
          onClick={handleDelete}
          className="aria-disabled:opacity-50"
        >
          <Trash2 />
        </Button>
      </div>
      {!photo.canDelete && (
        <p id={reasonId} className="sr-only">
          {PHOTO_IN_USE_REASON}
        </p>
      )}
      <DeletePhotoDialog photo={photo} open={confirming} onOpenChange={setConfirming} />
    </li>
  );
}
