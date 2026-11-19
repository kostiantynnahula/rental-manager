'use client';

import { useCallback } from 'react';

// A local preview of a picked file. The object URL lives as long as the <img> (React 19 ref cleanup revokes it),
// so no state or effect is needed.
export function FilePreview({ file }: { file: File }) {
  const attach = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) return;
      const url = URL.createObjectURL(file);
      img.src = url;
      return () => URL.revokeObjectURL(url);
    },
    [file],
  );

  return (
    // eslint-disable-next-line @next/next/no-img-element -- a local blob, nothing to optimize
    <img
      ref={attach}
      alt={file.name}
      className="aspect-square w-full rounded-md bg-muted object-cover"
    />
  );
}
