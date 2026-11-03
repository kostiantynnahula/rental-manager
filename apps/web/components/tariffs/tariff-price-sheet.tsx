'use client';

import { FormSheet } from '@/components/form-sheet';
import type { TariffDetail, TariffPrice } from '@/lib/api/queries/tariffs';
import { TariffPriceForm } from './tariff-price-form';

interface TariffPriceSheetProps {
  tariff: TariffDetail;
  // Fix this row; a new price otherwise.
  price?: TariffPrice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TariffPriceSheet({ tariff, price, open, onOpenChange }: TariffPriceSheetProps) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={price ? 'Виправити ціну' : 'Нова ціна'}
      description={
        price
          ? 'Лише для виправлення помилки. Якщо ціна змінилася — додайте нову, щоб минулі місяці рахувались за старою.'
          : 'Ціна діє з обраного місяця; попередні ціни залишаються для минулих місяців.'
      }
    >
      {/* Mounted only while open: a fresh form with current values every time. */}
      {open && <TariffPriceForm tariff={tariff} price={price} onDone={() => onOpenChange(false)} />}
    </FormSheet>
  );
}
