import type { TenantStatus } from '@/lib/api/queries/tenants';

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  LIVING: 'Проживає',
  FORMER: 'Колишній',
  NONE: 'Без договору',
};

export const TENANT_STATUS_BADGE_VARIANTS: Record<
  TenantStatus,
  'default' | 'secondary' | 'outline'
> = {
  LIVING: 'default',
  FORMER: 'secondary',
  NONE: 'outline',
};
