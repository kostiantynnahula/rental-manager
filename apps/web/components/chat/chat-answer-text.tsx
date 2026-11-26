'use client';

import { MessageResponse } from '@/components/ai-elements/message';
import { splitPhotoMarkers } from './helpers/split-photo-markers';
import { PhotoChip } from './photo-chip';

// Markdown with the [[photo:<id>]] markers turned into thumbnail chips. A marker splits the markdown there, so
// adjacent chips are grouped into one row.
export function ChatAnswerText({ text, apartmentId }: { text: string; apartmentId: string }) {
  const segments = splitPhotoMarkers(text);
  const blocks: ({ type: 'text'; text: string } | { type: 'photos'; ids: string[] })[] = [];
  for (const segment of segments) {
    const last = blocks.at(-1);
    if (segment.type === 'text') blocks.push({ type: 'text', text: segment.text });
    else if (last?.type === 'photos') last.ids.push(segment.photoId);
    else blocks.push({ type: 'photos', ids: [segment.photoId] });
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, i) =>
        block.type === 'text' ? (
          <MessageResponse key={i}>{block.text}</MessageResponse>
        ) : (
          <div key={i} className="flex flex-wrap gap-2">
            {block.ids.map((id) => (
              <PhotoChip key={id} photoId={id} apartmentId={apartmentId} />
            ))}
          </div>
        ),
      )}
    </div>
  );
}
