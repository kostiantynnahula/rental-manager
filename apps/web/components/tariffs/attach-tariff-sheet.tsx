'use client';

import { FormSheet } from '@/components/form-sheet';
import { AttachTariffForm } from './attach-tariff-form';

interface AttachTariffSheetProps {
  apartmentId: string;
  attachedTariffIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttachTariffSheet({
  apartmentId,
  attachedTariffIds,
  open,
  onOpenChange,
}: AttachTariffSheetProps) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Підключити тариф"
      description="Тариф з’явиться в рахунку квартири з обраного місяця."
    >
      {/* Mounted only while open: a fresh form every time. */}
      {open && (
        <AttachTariffForm
          apartmentId={apartmentId}
          attachedTariffIds={attachedTariffIds}
          onDone={() => onOpenChange(false)}
        />
      )}
    </FormSheet>
  );
}
