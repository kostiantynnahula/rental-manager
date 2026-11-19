import type { LeaseDates } from '../interfaces/lease-dates.interface';

// Same rule as the API's lease of a photo: startDate ≤ takenOn ≤ endDate ?? ∞ ("YYYY-MM-DD" compares as strings).
export function isWithinLease(takenOn: string, lease: LeaseDates): boolean {
  return takenOn >= lease.startDate && (lease.endDate === null || takenOn <= lease.endDate);
}
