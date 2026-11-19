import type { ConditionPhotoEvent } from '@/lib/api/queries/condition-photos';
import { todayDateOnly } from '@/lib/format';
import { leaseStatus } from '@/lib/leases';

// From a lease page: an ended lease → check-out photos, otherwise check-in.
export function defaultEvent(lease: {
  startDate: string;
  endDate: string | null;
}): ConditionPhotoEvent {
  return leaseStatus(lease, todayDateOnly()) === 'ENDED' ? 'CHECK_OUT' : 'CHECK_IN';
}
