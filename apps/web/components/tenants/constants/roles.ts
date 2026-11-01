import type { LeaseTenantRole } from '@/lib/api/queries/tenants';

export const LEASE_ROLE_LABELS: Record<LeaseTenantRole, string> = {
  PRIMARY: 'Основний',
  CONTACT: 'Контактна особа',
};
