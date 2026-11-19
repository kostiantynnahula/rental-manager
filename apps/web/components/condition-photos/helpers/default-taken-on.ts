import { todayDateOnly } from '@/lib/format';
import type { LeaseDates } from '../interfaces/lease-dates.interface';

// Today, except for an ended lease: its last day, so the check-out photos stay within the lease (the API derives
// the lease from takenOn, and the lease page lists by it). An upcoming lease can't get its start date: it's in the
// future — the form shows a hint instead.
export function defaultTakenOn(lease: LeaseDates | undefined): string {
  const today = todayDateOnly();
  return lease?.endDate && lease.endDate < today ? lease.endDate : today;
}
