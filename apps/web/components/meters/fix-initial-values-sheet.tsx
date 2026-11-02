'use client';

import { FormSheet } from '@/components/form-sheet';
import type { Meter } from '@/lib/api/queries/meters';
import { formatDate } from '@/lib/format';
import { FixInitialValuesForm } from './fix-initial-values-form';
import { meterTitle } from './helpers/meter-title';

interface FixInitialValuesSheetProps {
  meter: Meter;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FixInitialValuesSheet({ meter, open, onOpenChange }: FixInitialValuesSheetProps) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Виправити початкові показання"
      description={`${meterTitle(meter)}, встановлено ${formatDate(meter.installedAt)}`}
    >
      {open && <FixInitialValuesForm meter={meter} onDone={() => onOpenChange(false)} />}
    </FormSheet>
  );
}
