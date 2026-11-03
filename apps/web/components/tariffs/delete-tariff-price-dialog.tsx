'use client';

import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { applyApiError } from '@/lib/api/api-error';
import {
  useDeleteTariffPrice,
  type TariffDetail,
  type TariffPrice,
} from '@/lib/api/queries/tariffs';
import { formatPeriod } from '@/lib/format';
import { formatPrice } from '@/lib/tariff-prices';
import { priceUnit } from './helpers/price-unit';

interface DeleteTariffPriceDialogProps {
  tariff: TariffDetail;
  price: TariffPrice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// For a row added by mistake (the only 409: the earliest month would lose its TOTAL price).
export function DeleteTariffPriceDialog({
  tariff,
  price,
  open,
  onOpenChange,
}: DeleteTariffPriceDialogProps) {
  const remove = useDeleteTariffPrice(tariff.id);

  function confirm() {
    remove.mutate(price.id, {
      onSuccess: () => toast.success('Ціну видалено'),
      onError: (error) =>
        applyApiError(error, {
          messages: {
            409: 'Не можна видалити: найраніший місяць залишиться без загальної ціни',
          },
        }),
      onSettled: () => onOpenChange(false),
    });
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Видалити ціну?"
      description={`${formatPrice(price.price)} ${priceUnit(tariff)} з ${formatPeriod(price.effectiveFrom)}. Це для ціни, доданої помилково.`}
      confirmLabel="Видалити"
      destructive
      pending={remove.isPending}
      onConfirm={confirm}
    />
  );
}
