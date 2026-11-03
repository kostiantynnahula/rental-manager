'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';

// Warns before leaving a form with unsaved changes:
// - reload / close tab / external navigation → the browser's own `beforeunload` prompt;
// - clicks on in-app links (nav, breadcrumbs) → our dialog; confirming continues to the link;
// - the Cancel button → wrap its action in confirmLeave().
// The browser Back button / swipe-back can't be intercepted in the App Router.
export function useUnsavedChanges(isDirty: boolean) {
  const router = useRouter();
  // Set by allowLeave() right before navigating after a successful save.
  const allowedRef = useRef(false);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowedRef.current) return;
      event.preventDefault();
    };

    // Capture phase on document runs before React's handlers (and next/link's navigation) on the root.
    const onClick = (event: MouseEvent) => {
      if (allowedRef.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; // new tab/window
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!(link instanceof HTMLAnchorElement)) return;
      if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin) return; // beforeunload covers it
      if (url.pathname === window.location.pathname && url.search === window.location.search)
        return;
      event.preventDefault();
      event.stopPropagation();
      setPendingLeave(() => () => router.push(url.pathname + url.search + url.hash));
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [isDirty, router]);

  // The page is hidden, not unmounted, on navigation (Activity): re-arm the guard for the next visit.
  useLayoutEffect(
    () => () => {
      allowedRef.current = false;
      setPendingLeave(null);
    },
    [],
  );

  const confirmLeave = useCallback(
    (leave: () => void) => {
      if (isDirty && !allowedRef.current) setPendingLeave(() => leave);
      else leave();
    },
    [isDirty],
  );

  const allowLeave = useCallback(() => {
    allowedRef.current = true;
  }, []);

  const dialog = (
    <ConfirmDialog
      open={pendingLeave !== null}
      onOpenChange={(open) => !open && setPendingLeave(null)}
      title="Незбережені зміни"
      description="Зміни буде втрачено. Вийти без збереження?"
      confirmLabel="Вийти"
      cancelLabel="Залишитися"
      destructive
      onConfirm={() => {
        const leave = pendingLeave;
        allowedRef.current = true;
        setPendingLeave(null);
        leave?.();
      }}
    />
  );

  return { confirmLeave, allowLeave, dialog };
}
