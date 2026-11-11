'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { NativeSelect } from '@/components/native-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Apartment } from '@/lib/api/queries/apartments';
import { useAssignPhotoApartment, type Photo } from '@/lib/api/queries/photos';
import { formatInstantDate } from '@/lib/format';
import { ApiImage } from './api-image';
import { PHOTO_IN_USE_REASON } from './constants/messages';
import { PARSE_STATUS_BADGES } from './constants/parse-statuses';
import { DeletePhotoDialog } from './delete-photo-dialog';
import { assignErrorMessage } from './helpers/assign-error-message';
import { PhotoFullscreen } from './photo-fullscreen';

// An inbox photo: zoom to read the meter, then pick its apartment (unless the worker is still on it). After the
// assignment the API re-parses it against the apartment's meters and the usual review screen opens.
export function InboxPhotoCard({ photo, apartments }: { photo: Photo; apartments: Apartment[] }) {
  const router = useRouter();
  const selectId = useId();
  const [apartmentId, setApartmentId] = useState('');
  const [zoomed, setZoomed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const assign = useAssignPhotoApartment(photo.id);
  const date = formatInstantDate(photo.createdAt);
  const pending = photo.parseStatus === 'PENDING';
  const badge = photo.parseStatus && PARSE_STATUS_BADGES[photo.parseStatus];

  function handleAssign() {
    if (!apartmentId) return;
    assign.mutate(apartmentId, {
      onSuccess: () => {
        toast.success('Квартиру призначено — фото розпізнається ще раз');
        router.push(`/apartments/${apartmentId}/photos/${photo.id}`);
      },
      onError: (error) => toast.error(assignErrorMessage(error)),
    });
  }

  function handleDelete() {
    if (photo.canDelete) setConfirming(true);
    else toast.info(PHOTO_IN_USE_REASON);
  }

  return (
    <li className="overflow-hidden rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label={`Збільшити фото від ${date}`}
        className="relative block aspect-square w-full bg-muted"
      >
        <ApiImage
          src={photo.thumbnailUrl}
          alt={`Фото від ${date}`}
          className="size-full object-cover"
        />
        {badge && (
          <Badge
            variant={pending ? 'secondary' : 'destructive'}
            className="absolute top-2 left-2 bg-background/90"
          >
            {badge}
          </Badge>
        )}
      </button>
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm text-muted-foreground">{date}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Видалити фото від ${date}`}
            aria-disabled={!photo.canDelete}
            onClick={handleDelete}
            className="-mr-2 aria-disabled:opacity-50"
          >
            <Trash2 />
          </Button>
        </div>
        {photo.parseNote && !pending && (
          <details className="text-xs text-muted-foreground">
            <summary className="flex min-h-11 cursor-pointer items-center md:min-h-8">
              Деталі
            </summary>
            <p className="break-words whitespace-pre-wrap">{photo.parseNote}</p>
          </details>
        )}
        {pending ? (
          <p className="text-sm text-muted-foreground">Шукаємо лічильник за серійним номером…</p>
        ) : (
          <div className="space-y-2">
            <label htmlFor={selectId} className="sr-only">
              Квартира
            </label>
            <NativeSelect
              id={selectId}
              value={apartmentId}
              onChange={(e) => setApartmentId(e.target.value)}
              disabled={assign.isPending}
            >
              <option value="">Оберіть квартиру</option>
              {apartments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NativeSelect>
            <Button
              type="button"
              className="w-full"
              disabled={!apartmentId || assign.isPending}
              onClick={handleAssign}
            >
              {assign.isPending && <Loader2 className="animate-spin" />}
              Призначити
            </Button>
          </div>
        )}
      </div>
      <PhotoFullscreen
        src={photo.fileUrl}
        alt={`Фото лічильника від ${date}`}
        open={zoomed}
        onOpenChange={setZoomed}
      />
      <DeletePhotoDialog photo={photo} open={confirming} onOpenChange={setConfirming} />
    </li>
  );
}
