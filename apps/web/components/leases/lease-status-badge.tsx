import { Badge } from '@/components/ui/badge';
import type { LeaseStatus } from '@/lib/leases';
import { LEASE_STATUS_BADGE_VARIANTS, LEASE_STATUS_LABELS } from './constants/statuses';

export function LeaseStatusBadge({ status }: { status: LeaseStatus }) {
  return <Badge variant={LEASE_STATUS_BADGE_VARIANTS[status]}>{LEASE_STATUS_LABELS[status]}</Badge>;
}
