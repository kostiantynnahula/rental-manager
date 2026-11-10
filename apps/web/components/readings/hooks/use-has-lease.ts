import { useApartmentLeases } from '@/lib/api/queries/leases';
import { isPeriod, leaseCoversPeriod } from '@/lib/period';

// A lease of the apartment covers the month (for the zero-electricity warning). False while loading or on error:
// the warning is a hint, it never blocks anything.
export function useHasLease(apartmentId: string, period: string): boolean {
  const leases = useApartmentLeases(apartmentId);
  return isPeriod(period) && (leases.data ?? []).some((l) => leaseCoversPeriod(l, period));
}
