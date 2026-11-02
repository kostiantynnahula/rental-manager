import Link from 'next/link';
import type { LeaseTenant } from '@/lib/leases';
import { PhoneLink } from './phone-link';

// A lease tenant: name (link to the tenant page) + phone (tel: link).
export function LeaseTenantLine({ tenant }: { tenant: LeaseTenant }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
      <Link
        href={`/tenants/${tenant.tenantId}`}
        className="inline-flex min-h-11 items-center underline-offset-4 hover:underline md:min-h-0"
      >
        {tenant.fullName}
      </Link>
      <PhoneLink phone={tenant.phone} />
    </div>
  );
}
