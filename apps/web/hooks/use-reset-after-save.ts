'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

// With cacheComponents, Next.js hides a page on navigation (React <Activity>) instead of unmounting it, so its
// state survives: a form that saved and navigated away would come back with the submitted values (and a
// disabled "saved" button). Call markSaved() after a successful save; when the page is hidden, `reset` runs.
// Unsaved drafts are left alone — keeping them is what Activity is for.
export function useResetAfterSave(reset: () => void): () => void {
  const pending = useRef(false);
  const resetRef = useRef(reset);

  useEffect(() => {
    resetRef.current = reset;
  });

  // Layout-effect cleanup runs synchronously when Activity hides the page, so it never shows stale values.
  useLayoutEffect(
    () => () => {
      if (!pending.current) return;
      pending.current = false;
      resetRef.current();
    },
    [],
  );

  return useCallback(() => {
    pending.current = true;
  }, []);
}
