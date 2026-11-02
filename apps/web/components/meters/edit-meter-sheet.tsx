'use client';

import { FormSheet } from '@/components/form-sheet';
import type { Meter } from '@/lib/api/queries/meters';
import { EditMeterForm } from './edit-meter-form';
import { meterTitle } from './helpers/meter-title';
interface EditMeterSheetProps {
  meter: Meter;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Label, serial number, notes (utility and zone scheme are fixed; a different meter = Замінити).
export function EditMeterSheet({ meter, open, onOpenChange }: EditMeterSheetProps) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Редагувати лічильник"
      description={meterTitle(meter)}
    >
      {/* Mounted only while open: a fresh form with current values every time. */}
      {open && <EditMeterForm meter={meter} onDone={() => onOpenChange(false)} />}
    </FormSheet>
  );
}
