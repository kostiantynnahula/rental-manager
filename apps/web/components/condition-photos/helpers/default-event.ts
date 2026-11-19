import type { ConditionPhotoEvent } from '@/lib/api/queries/condition-photos';
import { todayDateOnly } from '@/lib/format';
import { leaseStatus } from '@/lib/leases';
import type { LeaseDates } from '../interfaces/lease-dates.interface';

// Lease page: an ended lease → check-out photos, otherwise check-in. Apartment tab (no lease) → a change.
export function defaultEvent(lease: LeaseDates | undefined): ConditionPhotoEvent {
  if (!lease) return 'CHANGE';
  return leaseStatus(lease, todayDateOnly()) === 'ENDED' ? 'CHECK_OUT' : 'CHECK_IN';
}
