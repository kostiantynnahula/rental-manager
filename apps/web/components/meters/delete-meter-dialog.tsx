'use client';

import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { applyApiError } from '@/lib/api/api-error';
import { useDeleteMeter, type Meter } from '@/lib/api/queries/meters';
import { meterTitle } from './helpers/meter-title';

interface DeleteMeterDialogProps {
  meter: Meter;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// For a meter added by mistake (the API allows it only without regular/final readings).
export function DeleteMeterDialog({ meter, open, onOpenChange }: DeleteMeterDialogProps) {
  const remove = useDeleteMeter(meter.id);

  function confirm() {
    remove.mutate(undefined, {
      onSuccess: () => toast.success('Лічильник видалено'),
      onError: (error) =>
        applyApiError(error, { messages: { 409: 'Є показання — лічильник можна лише зняти' } }),
      onSettled: () => onOpenChange(false),
    });
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Видалити лічильник?"
      description={`${meterTitle(meter)} і його початкові показання буде видалено назавжди. Це для лічильника, доданого помилково.`}
      confirmLabel="Видалити"
      destructive
      pending={remove.isPending}
      onConfirm={confirm}
    />
  );
}
