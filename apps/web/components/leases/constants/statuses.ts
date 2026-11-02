import type { LeaseStatus } from '@/lib/leases';

export const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  ACTIVE: 'Активний',
  ENDED: 'Завершений',
  UPCOMING: 'Майбутній',
};

export const LEASE_STATUS_BADGE_VARIANTS: Record<LeaseStatus, 'default' | 'secondary' | 'outline'> =
  {
    ACTIVE: 'default',
    ENDED: 'secondary',
    UPCOMING: 'outline',
  };
