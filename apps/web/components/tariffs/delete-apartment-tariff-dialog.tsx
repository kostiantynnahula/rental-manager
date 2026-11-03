'use client';

import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { applyApiError } from '@/lib/api/api-error';
import {
  useDeleteApartmentTariff,
  type ApartmentTariff,
} from '@/lib/api/queries/apartment-tariffs';

interface DeleteApartmentTariffDialogProps {
  apartmentId: string;
  attachment: ApartmentTariff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// For an attachment made by mistake; a tariff that stops applying is "Відключити" (history stays).
export function DeleteApartmentTariffDialog({
  apartmentId,
  attachment,
  open,
  onOpenChange,
}: DeleteApartmentTariffDialogProps) {
  const remove = useDeleteApartmentTariff(apartmentId);

  function confirm() {
    remove.mutate(attachment.id, {
      onSuccess: () => toast.success('Підключення видалено'),
      onError: (error) => applyApiError(error),
      onSettled: () => onOpenChange(false),
    });
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Видалити підключення?"
      description={`«${attachment.tariff.name}» зникне з цієї квартири, наче його не підключали. Це для помилкового підключення; якщо тариф просто перестав діяти — відключіть його.`}
      confirmLabel="Видалити"
      destructive
      pending={remove.isPending}
      onConfirm={confirm}
    />
  );
}
