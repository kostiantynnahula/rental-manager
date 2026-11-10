'use client';

import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { formatMeterValue, normalizeMeterValue } from '@/lib/meter-values';
import {
  UTILITY_UNITS,
  ZONE_LABELS,
  zonesFor,
  type UtilityType,
  type Zone,
  type ZoneScheme,
} from '@/lib/utilities';

interface ReadingValuesInputProps<T extends FieldValues> {
  control: Control<T>;
  // Path to a ReadingValueField[] in the form, one entry per zone in `zones` order (see helpers/empty-values.ts).
  name: Path<T>;
  zoneScheme: ZoneScheme;
  utility: UtilityType;
  // Last confirmed values: shown under each field (the "not lower" rule is in readingValuesSchema).
  previous?: ReadonlyArray<{ zone: Zone; value: string }>;
  idPrefix: string;
  disabled?: boolean;
  // Only these zones (in this order; `name` holds one entry per zone), e.g. the ones read from a photo.
  // Default: every zone of the scheme.
  zones?: Zone[];
}

// One decimal input per zone of the meter, with the zone name and unit. Reused by meters, readings and photo
// review. Values stay strings; on blur a valid value is shown as "1520,350".
export function ReadingValuesInput<T extends FieldValues>({
  control,
  name,
  zoneScheme,
  utility,
  previous,
  idPrefix,
  disabled,
  zones = zonesFor(zoneScheme),
}: ReadingValuesInputProps<T>) {
  const unit = UTILITY_UNITS[utility];

  return (
    <div className={zones.length > 1 ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
      {zones.map((zone, index) => {
        const id = `${idPrefix}-${zone.toLowerCase()}`;
        const before = previous?.find((p) => p.zone === zone);
        return (
          <Controller
            key={zone}
            control={control}
            name={`${name}.${index}.value` as Path<T>}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={id}>{ZONE_LABELS[zone]}</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    {...field}
                    value={(field.value as string | undefined) ?? ''}
                    onBlur={() => {
                      const normalized = normalizeMeterValue(String(field.value ?? ''));
                      if (normalized) field.onChange(formatMeterValue(normalized));
                      field.onBlur();
                    }}
                    id={id}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0,000"
                    disabled={disabled}
                    aria-invalid={fieldState.invalid}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>{unit}</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : (
                  before && (
                    <FieldDescription>
                      Попереднє: {formatMeterValue(before.value)} {unit}
                    </FieldDescription>
                  )
                )}
              </Field>
            )}
          />
        );
      })}
    </div>
  );
}
