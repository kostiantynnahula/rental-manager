import Link from 'next/link';
import type { Apartment } from '@/lib/api/queries/apartments';
import { formatDate } from '@/lib/format';
import { primaryTenant, type Lease } from '@/lib/leases';

export function CurrentLeaseNote({ apartment, lease }: { apartment: Apartment; lease: Lease }) {
  const primary = primaryTenant(lease);
  return (
    <div className="space-y-1 rounded-lg border bg-muted px-4 py-3 text-sm" role="status">
      <p>
        Активний договір: {primary?.fullName ?? 'без основного орендаря'}, з{' '}
        {formatDate(lease.startDate)}. Мешканця буде додано як контактну особу.
      </p>
      <Link
        href={`/apartments/${apartment.id}?tab=leases`}
        className="inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline md:min-h-0"
      >
        Договори квартири
      </Link>
    </div>
  );
}
