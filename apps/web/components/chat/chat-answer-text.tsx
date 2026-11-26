'use client';

import { useMemo, type ComponentProps } from 'react';
import { MessageResponse } from '@/components/ai-elements/message';
import { PHOTO_LINK_PREFIX, photoMarkersToLinks } from './helpers/photo-markers-to-links';
import { PhotoChip } from './photo-chip';

// Markdown with the [[photo:<id>]] markers as thumbnail chips inside the text. Other links open in a new tab.
export function ChatAnswerText({ text, apartmentId }: { text: string; apartmentId: string }) {
  const components = useMemo(
    () => ({
      a: ({ href, children, node: _node, ...props }: ComponentProps<'a'> & { node?: unknown }) =>
        href?.startsWith(PHOTO_LINK_PREFIX) ? (
          <PhotoChip
            photoId={decodeURIComponent(href.slice(PHOTO_LINK_PREFIX.length))}
            apartmentId={apartmentId}
            inline
          />
        ) : (
          <a {...props} href={href} target="_blank" rel="noreferrer" className="underline">
            {children}
          </a>
        ),
    }),
    [apartmentId],
  );

  return <MessageResponse components={components}>{photoMarkersToLinks(text)}</MessageResponse>;
}
