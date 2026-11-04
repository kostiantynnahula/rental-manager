'use client';

import { Ban, ChevronLeft, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useApartment } from '@/lib/api/queries/apartments';
import type { Statement } from '@/lib/api/queries/statements';
import { formatInstantDate, formatPeriod } from '@/lib/format';
import { CancelStatementSheet } from './cancel-statement-sheet';
import { StatementLines } from './statement-lines';
import { StatementStatusBadge } from './statement-status-badge';
import { StatementWarnings } from './statement-warnings';

// Everything here is the saved snapshot; only the apartment name and the tenant's name are current.
export function StatementDetailView({ statement }: { statement: Statement }) {
  const [cancelling, setCancelling] = useState(false);
  const apartment = useApartment(statement.apartmentId);
  const apartmentHref = `/apartments/${statement.apartmentId}`;
  const apartmentName = apartment.data?.name ?? 'Квартира';

  return (
    <section className="max-w-2xl space-y-4">
      <Button asChild variant="ghost" className="-ml-3">
        <Link href={`${apartmentHref}?tab=statements`}>
          <ChevronLeft />
          Рахунки
        </Link>
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">Рахунок за {formatPeriod(statement.period)}</h1>
            <StatementStatusBadge status={statement.status} />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Квартира</dt>
            <dd className="min-w-0 break-words">
              <Link href={apartmentHref} className="underline">
                {apartmentName}
              </Link>
            </dd>
            <dt className="text-muted-foreground">Виставлено</dt>
            <dd>{formatInstantDate(statement.issuedAt)}</dd>
            {statement.lease?.primaryTenantName && (
              <>
                <dt className="text-muted-foreground">Мешканець</dt>
                <dd className="min-w-0 break-words">{statement.lease.primaryTenantName}</dd>
              </>
            )}
          </dl>
        </div>
        {statement.status === 'ISSUED' && (
          <Button variant="outline" className="sm:shrink-0" onClick={() => setCancelling(true)}>
            <Ban />
            Скасувати
          </Button>
        )}
      </div>

      {statement.status === 'CANCELLED' && (
        <div role="status" className="space-y-3 rounded-lg border bg-muted px-4 py-3 text-sm">
          <div className="space-y-1">
            <p className="font-medium">
              Скасовано
              {statement.cancelledAt && ` ${formatInstantDate(statement.cancelledAt)}`}
            </p>
            {statement.cancelNote && <p className="break-words">{statement.cancelNote}</p>}
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`${apartmentHref}/statements/new?period=${statement.period}`}>
              <RotateCcw />
              Виставити заново
            </Link>
          </Button>
        </div>
      )}

      <StatementLines lines={statement.lines} total={statement.totalAmount} />
      <StatementWarnings warnings={statement.warnings} />

      {statement.status === 'ISSUED' && (
        <CancelStatementSheet
          statement={statement}
          open={cancelling}
          onOpenChange={setCancelling}
        />
      )}
    </section>
  );
}
