'use client';

import { CalendarCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { applyApiError } from '@/lib/api/api-error';
import { ApiError } from '@/lib/api/errors';
import { useEndLease, type Lease } from '@/lib/api/queries/leases';
import { formatDate, todayDateOnly } from '@/lib/format';

// "Завершити" for an open-ended lease: sets endDate (inclusive last day). An existing endDate is changed in Умови.
export function EndLeaseDialog({ lease }: { lease: Lease }) {
  const [open, setOpen] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const end = useEndLease(lease.id);

  function openDialog() {
    // Today, unless the lease starts later (the end can't be before the start).
    const today = todayDateOnly();
    setEndDate(today < lease.startDate ? lease.startDate : today);
    setError(null);
    setOpen(true);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return setError('Вкажіть дату');
    if (endDate < lease.startDate)
      return setError(`Не раніше дати початку (${formatDate(lease.startDate)})`);
    end.mutate(endDate, {
      onSuccess: () => {
        toast.success('Договір завершено');
        setOpen(false);
      },
      onError: (e) => {
        if (e instanceof ApiError && e.status === 400) setError('Не раніше дати початку');
        else applyApiError(e, { messages: { 409: 'Договір уже завершено' } });
      },
    });
  }

  return (
    <>
      <Button variant="outline" onClick={openDialog}>
        <CalendarCheck />
        Завершити
      </Button>
      <Dialog open={open} onOpenChange={(next) => !end.isPending && setOpen(next)}>
        <DialogContent>
          <form noValidate onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Завершити договір</DialogTitle>
              <DialogDescription>Останній день оренди (включно).</DialogDescription>
            </DialogHeader>
            <Field data-invalid={error !== null}>
              <FieldLabel htmlFor="lease-end-date">Дата завершення</FieldLabel>
              <Input
                id="lease-end-date"
                type="date"
                min={lease.startDate}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setError(null);
                }}
                aria-invalid={error !== null}
              />
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={end.isPending}
              >
                Скасувати
              </Button>
              <Button type="submit" disabled={end.isPending}>
                {end.isPending ? 'Збереження…' : 'Завершити'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
