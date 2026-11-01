import { Badge } from '@/components/ui/badge';
import type { TenantStatus } from '@/lib/api/queries/tenants';
import { TENANT_STATUS_BADGE_VARIANTS, TENANT_STATUS_LABELS } from './constants/statuses';

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  return (
    <Badge variant={TENANT_STATUS_BADGE_VARIANTS[status]}>{TENANT_STATUS_LABELS[status]}</Badge>
  );
}
