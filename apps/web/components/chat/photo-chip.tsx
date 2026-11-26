import Link from 'next/link';
import { ApiImage } from '@/components/photos/api-image';
import { conditionPhotoThumbnailUrl } from './helpers/condition-photo-thumbnail-url';

// A cited condition photo: its thumbnail, a link to the photo's page.
export function PhotoChip({ photoId, apartmentId }: { photoId: string; apartmentId: string }) {
  return (
    <Link
      href={`/apartments/${apartmentId}/condition-photos/${photoId}`}
      aria-label="Відкрити фото"
      className="block size-16 shrink-0 overflow-hidden rounded-md border bg-muted"
    >
      <ApiImage
        src={conditionPhotoThumbnailUrl(photoId)}
        alt=""
        className="size-full object-cover"
      />
    </Link>
  );
}
