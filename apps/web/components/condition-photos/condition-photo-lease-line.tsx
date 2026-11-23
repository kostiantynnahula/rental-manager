import Link from 'next/link';
import type { ConditionPhotoDetail } from '@/lib/api/queries/condition-photos';
import { formatDate } from '@/lib/format';

// The lease covering takenOn (derived by the API), or a hint that the photo is outside any lease.
export function ConditionPhotoLeaseLine({ lease }: { lease: ConditionPhotoDetail['lease'] }) {
  if (!lease) return <p className="text-sm text-muted-foreground">Поза договором</p>;
  const primary = lease.tenants.find((t) => t.role === 'PRIMARY');
  const range = `${formatDate(lease.startDate)} – ${lease.endDate ? formatDate(lease.endDate) : '…'}`;
  return (
    <p className="text-sm">
      Договір:{' '}
      <Link href={`/leases/${lease.id}?from=apartment`} className="font-medium underline">
        {range}
        {primary && ` · ${primary.fullName}`}
      </Link>
    </p>
  );
}
