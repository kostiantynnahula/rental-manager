import type { Apartment } from '@/lib/api/queries/apartments';
import { formatMoney } from '@/lib/format';
import { primaryTenant } from '@/lib/leases';
import { ArchivedBadge } from './archived-badge';

// Mobile (< md) row of the apartments list.
export function ApartmentCard({ apartment }: { apartment: Apartment }) {
  const tenant = primaryTenant(apartment.currentLease);
  const rent = apartment.currentLease?.monthlyRent;
  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{apartment.name}</span>
        {!apartment.isActive && <ArchivedBadge />}
      </div>
      <p className="text-sm text-muted-foreground">{apartment.address}</p>
      <p className="text-sm">
        {tenant ? tenant.fullName : 'Без договору'}
        {rent !== undefined && <span className="whitespace-nowrap"> · {formatMoney(rent)}</span>}
      </p>
    </div>
  );
}
