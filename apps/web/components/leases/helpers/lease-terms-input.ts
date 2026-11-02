import type { LeaseTermsValues } from './lease-terms-schema';
import { parseMoney } from '@/lib/format';

// Form → API terms. The schema already validated rent, so parseMoney can't return null here.
export function leaseTermsInput(v: LeaseTermsValues) {
  return {
    startDate: v.startDate,
    endDate: v.endDate || null,
    monthlyRent: parseMoney(v.rent) ?? 0,
    notes: v.notes || null,
  };
}
