'use client';

import { X } from 'lucide-react';
import { Controller, type Control } from 'react-hook-form';
import { NativeSelect } from '@/components/native-select';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { useApartments, type Apartment } from '@/lib/api/queries/apartments';
import { CurrentLeaseNote } from './current-lease-note';
import type { TenantFormValues } from './helpers/tenant-form-schema';
import type { useAssignmentTarget } from './hooks/use-assignment-target';
import { NewLeaseFields } from './new-lease-fields';

interface TenantAssignmentSectionProps {
  control: Control<TenantFormValues>;
  target: ReturnType<typeof useAssignmentTarget>;
  onClear: () => void;
  idPrefix: string;
}

// "Прив’язати до квартири" on tenant create: pick an active apartment, then see what will happen.
export function TenantAssignmentSection({
  control,
  target,
  onClear,
  idPrefix,
}: TenantAssignmentSectionProps) {
  const apartments = useApartments('true');
  const selectId = `${idPrefix}-apartment`;

  return (
    <FieldSet>
      <FieldLegend>Прив’язати до квартири</FieldLegend>
      <Controller
        name="assignment.apartmentId"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={selectId}>Квартира</FieldLabel>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <NativeSelect
                  {...field}
                  id={selectId}
                  disabled={apartments.isPending}
                  aria-invalid={fieldState.invalid}
                >
                  <option value="">Не прив’язувати</option>
                  {apartments.data?.map((a: Apartment) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              {field.value && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onClear}
                  aria-label="Не прив’язувати"
                >
                  <X />
                </Button>
              )}
            </div>
            {fieldState.invalid ? (
              <FieldError errors={[fieldState.error]} />
            ) : (
              !field.value && (
                <FieldDescription>Необов’язково. Лише активні квартири.</FieldDescription>
              )
            )}
          </Field>
        )}
      />

      {apartments.isError && (
        <QueryError error={apartments.error} onRetry={() => void apartments.refetch()} />
      )}
      {target.apartmentId &&
        (target.query.isError ? (
          <QueryError error={target.query.error} onRetry={() => void target.query.refetch()} />
        ) : !target.apartment ? (
          <Skeleton className="h-16 w-full" />
        ) : target.apartment.currentLease ? (
          <CurrentLeaseNote apartment={target.apartment} lease={target.apartment.currentLease} />
        ) : (
          <NewLeaseFields control={control} idPrefix={idPrefix} />
        ))}
    </FieldSet>
  );
}
