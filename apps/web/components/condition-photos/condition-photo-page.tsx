'use client';

import { ChevronLeft, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { NotFoundState } from '@/components/not-found-state';
import { PhotoViewer } from '@/components/photos/photo-viewer';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isNotFoundError } from '@/lib/api/api-error';
import { useApartment } from '@/lib/api/queries/apartments';
import { useConditionPhoto } from '@/lib/api/queries/condition-photos';
import { formatDate } from '@/lib/format';
import { ConditionPhotoDescriptionForm } from './condition-photo-description-form';
import { ConditionPhotoLeaseLine } from './condition-photo-lease-line';
import { ConditionPhotoPageSkeleton } from './condition-photo-page-skeleton';
import { EVENT_LABELS } from './constants/events';
import { INDEX_STATUS_LABELS } from './constants/index-status';
import { DeleteConditionPhotoDialog } from './delete-condition-photo-dialog';
import { EditConditionPhotoSheet } from './edit-condition-photo-sheet';

type Panel = 'edit' | 'delete' | null;

// /apartments/[id]/condition-photos/[photoId]: the photo, its event · date · note, the lease, the index status and
// the description editor (the lightbox is too small to edit a list of items on a phone).
export function ConditionPhotoPage() {
  const { id, photoId } = useParams<{ id: string; photoId: string }>();
  const router = useRouter();
  const apartment = useApartment(id);
  const photo = useConditionPhoto(photoId);
  const [panel, setPanel] = useState<Panel>(null);
  const tabHref = `/apartments/${id}?tab=condition`;
  const close = (open: boolean) => !open && setPanel(null);

  if (apartment.isPending || photo.isPending) return <ConditionPhotoPageSkeleton />;
  if (apartment.isError) {
    return isNotFoundError(apartment.error) ? (
      <NotFoundState title="Квартиру не знайдено" backHref="/" backLabel="До списку квартир" />
    ) : (
      <QueryError error={apartment.error} onRetry={() => void apartment.refetch()} />
    );
  }
  if (photo.isError && !isNotFoundError(photo.error))
    return <QueryError error={photo.error} onRetry={() => void photo.refetch()} />;
  if (photo.isError || photo.data.apartmentId !== id)
    return <NotFoundState title="Фото не знайдено" backHref={tabHref} backLabel="До фото стану" />;

  const data = photo.data;
  const caption = `${EVENT_LABELS[data.event]} · ${formatDate(data.takenOn)}`;
  const status = INDEX_STATUS_LABELS[data.indexStatus];

  return (
    <section className="max-w-2xl space-y-4">
      <Button asChild variant="ghost" className="-ml-3">
        <Link href={tabHref}>
          <ChevronLeft />
          {apartment.data.name}
        </Link>
      </Button>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold">{caption}</h1>
          {data.note && (
            <p className="text-sm break-words whitespace-pre-wrap text-muted-foreground">
              {data.note}
            </p>
          )}
          <ConditionPhotoLeaseLine lease={data.lease} />
          {status && (
            <p className="text-sm text-muted-foreground">
              {status}
              {data.indexStatus === 'FAILED' && data.indexNote && `: ${data.indexNote}`}
            </p>
          )}
        </div>
        {/* Non-modal: a Sheet/Dialog opened from an item would otherwise fight the menu over focus. */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Дії з фото" className="shrink-0">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
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
      <PhotoViewer photo={data} alt={caption} />
      {/* Remount on a restore or an edit made elsewhere (fresh defaults), and when the worker's first description
          arrives; the page stays mounted (hidden) between photos, so another photo needs a fresh form too. */}
      <ConditionPhotoDescriptionForm
        key={`${data.id}:${data.descriptionEditedAt ?? 'model'}:${data.description === null}`}
        photo={data}
      />
      <EditConditionPhotoSheet photo={data} open={panel === 'edit'} onOpenChange={close} />
      <DeleteConditionPhotoDialog
        photo={data}
        open={panel === 'delete'}
        onOpenChange={close}
        onDeleted={() => router.replace(tabHref)}
      />
    </section>
  );
}
