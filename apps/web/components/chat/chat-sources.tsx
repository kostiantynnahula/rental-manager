import { PhotoChip } from './photo-chip';

// The data-sources part: every photo the answer cites, in order of first mention.
export function ChatSources({
  photoIds,
  apartmentId,
}: {
  photoIds: string[];
  apartmentId: string;
}) {
  if (photoIds.length === 0) return null;
  return (
    <div className="space-y-1 border-t pt-2">
      <p className="text-xs text-muted-foreground">Джерела</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {photoIds.map((id) => (
          <PhotoChip key={id} photoId={id} apartmentId={apartmentId} />
        ))}
      </div>
    </div>
  );
}
