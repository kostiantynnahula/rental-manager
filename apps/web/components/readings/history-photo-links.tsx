import { PhotoLinkButton } from '@/components/photos/photo-link-button';
import type { ReadingHistoryItem } from '@/lib/api/queries/readings';
import { historyPhotoLabel } from './helpers/history-photo-label';
import { historyPhotos } from './helpers/history-photos';

// 📷 per photo behind the item's values: a two-zone reading may link one photo per zone.
export function HistoryPhotoLinks({ item }: { item: ReadingHistoryItem }) {
  return historyPhotos(item).map(({ photoId, zones }) => (
    <PhotoLinkButton key={photoId} photoId={photoId} label={historyPhotoLabel(item, zones)} />
  ));
}
