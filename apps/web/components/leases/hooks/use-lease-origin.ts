'use client';

import { useSearchParams } from 'next/navigation';
import type { LeaseOrigin } from '../helpers/lease-back-target';

// Reads ?from / ?tenantId (useSearchParams → the page needs <Suspense>).
export function useLeaseOrigin(): LeaseOrigin {
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  return {
    from: from === 'apartment' || from === 'tenant' ? from : null,
    tenantId: searchParams.get('tenantId'),
  };
}
