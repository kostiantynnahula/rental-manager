'use client';

import { FormSheet } from '@/components/form-sheet';
import type { ApartmentTariff } from '@/lib/api/queries/apartment-tariffs';
import { EndApartmentTariffForm } from './end-apartment-tariff-form';

interface EndApartmentTariffSheetProps {
  apartmentId: string;
  attachment: ApartmentTariff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EndApartmentTariffSheet({
  apartmentId,
  attachment,
  open,
  onOpenChange,
}: EndApartmentTariffSheetProps) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Відключити тариф"
      description={attachment.tariff.name}
    >
      {/* Mounted only while open: a fresh form with current values every time. */}
      {open && (
        <EndApartmentTariffForm
          apartmentId={apartmentId}
          attachment={attachment}
          onDone={() => onOpenChange(false)}
        />
      )}
    </FormSheet>
  );
}
