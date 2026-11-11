'use client';

import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { parseManualAmount } from './helpers/parse-manual-amount';
import type { ManualTariff } from './interfaces/manual-tariff';

interface ManualAmountsFieldsProps {
  tariffs: ManualTariff[];
  // Raw text per tariff id, as typed.
  inputs: Record<string, string>;
  onChange: (tariffId: string, value: string) => void;
}

// One amount per active MANUAL tariff, typed in from the bill (e.g. the building's water share). Empty = not entered:
// the line is left out with a warning.
export function ManualAmountsFields({ tariffs, inputs, onChange }: ManualAmountsFieldsProps) {
  if (tariffs.length === 0) return null;
  return (
    <div className="space-y-3">
      {tariffs.map(({ tariffId, name }) => {
        const value = inputs[tariffId] ?? '';
        const invalid = value.trim() !== '' && parseManualAmount(value) === null;
        const id = `manual-amount-${tariffId}`;
        return (
          <Field key={tariffId} data-invalid={invalid} className="sm:max-w-xs">
            <FieldLabel htmlFor={id}>{name}, грн</FieldLabel>
            <Input
              id={id}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              value={value}
              onChange={(e) => onChange(tariffId, e.target.value)}
              aria-invalid={invalid}
            />
            {invalid ? (
              <FieldError>Вкажіть суму, напр. 1234,56</FieldError>
            ) : (
              <FieldDescription>Сума з рахунку за цей місяць</FieldDescription>
            )}
          </Field>
        );
      })}
    </div>
  );
}
