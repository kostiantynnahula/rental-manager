import Link from 'next/link';
import { ApiImage } from '@/components/photos/api-image';
import { cn } from '@/lib/utils';
import { conditionPhotoThumbnailUrl } from './helpers/condition-photo-thumbnail-url';

// A cited condition photo: its thumbnail, a link to the photo's page. `inline` = inside the answer's text.
export function PhotoChip({
  photoId,
  apartmentId,
  inline = false,
}: {
  photoId: string;
  apartmentId: string;
  inline?: boolean;
}) {
  return (
    <Link
      href={`/apartments/${apartmentId}/condition-photos/${encodeURIComponent(photoId)}`}
      aria-label="Відкрити фото"
      className={cn(
        'shrink-0 overflow-hidden rounded-md border bg-muted',
        inline ? 'mx-0.5 inline-block size-11 align-middle' : 'block size-16',
      )}
    >
      <ApiImage
        src={conditionPhotoThumbnailUrl(photoId)}
        alt=""
        className="size-full object-cover"
      />
    </Link>
  );
}
