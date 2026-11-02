'use client';

import { FormSheet } from '@/components/form-sheet';
import type { Meter } from '@/lib/api/queries/meters';
import { meterTitle } from './helpers/meter-title';
import { RemoveMeterForm } from './remove-meter-form';

interface RemoveMeterSheetProps {
  meter: Meter;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RemoveMeterSheet({ meter, open, onOpenChange }: RemoveMeterSheetProps) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Зняти лічильник"
      description={`${meterTitle(meter)}. Кінцеві показання закриють його; споживання за цей місяць врахує їх.`}
    >
      {open && <RemoveMeterForm meter={meter} onDone={() => onOpenChange(false)} />}
    </FormSheet>
  );
}
