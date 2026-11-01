import type { TenantListItem } from '@/lib/api/queries/tenants';
import { formatPhone } from '@/lib/phone';
import { TenantStatusBadge } from './tenant-status-badge';

// Mobile (< md) row of the tenants list.
export function TenantCard({ tenant }: { tenant: TenantListItem }) {
  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{tenant.fullName}</span>
        <TenantStatusBadge status={tenant.status} />
      </div>
      <p className="text-sm whitespace-nowrap">{formatPhone(tenant.phone)}</p>
      {tenant.currentApartment && (
        <p className="text-sm text-muted-foreground">{tenant.currentApartment.name}</p>
      )}
    </div>
  );
}
