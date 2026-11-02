'use client';

import { Field, FieldLabel } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ZONE_SCHEME_LABELS, type ZoneScheme } from '@/lib/utilities';

interface ZoneSchemeFieldProps {
  value: ZoneScheme;
  onChange: (value: ZoneScheme) => void;
  idPrefix: string;
}

// "Одна зона / День/ніч" — only rendered for electricity (see zoneSchemesFor).
export function ZoneSchemeField({ value, onChange, idPrefix }: ZoneSchemeFieldProps) {
  return (
    <Field>
      <FieldLabel>Тарифні зони</FieldLabel>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as ZoneScheme)}
        className="grid grid-cols-2 gap-2"
      >
        {(['SINGLE', 'DAY_NIGHT'] as const).map((scheme) => (
          <label
            key={scheme}
            htmlFor={`${idPrefix}-${scheme}`}
            className="flex min-h-11 items-center gap-3 rounded-lg border px-3 has-data-checked:border-primary"
          >
            <RadioGroupItem id={`${idPrefix}-${scheme}`} value={scheme} />
            {ZONE_SCHEME_LABELS[scheme]}
          </label>
        ))}
      </RadioGroup>
    </Field>
  );
}
