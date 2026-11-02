'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { applyApiError, type FieldErrorRule } from '@/lib/api/api-error';
import type { Apartment } from '@/lib/api/queries/apartments';
import { useCreateLease } from '@/lib/api/queries/leases';
import { todayDateOnly } from '@/lib/format';
import { LEASE_TERMS_SERVER_ERRORS } from './constants/server-errors';
import { leaseCreateSchema, type LeaseCreateValues } from './helpers/lease-create-schema';
import { leaseTermsInput } from './helpers/lease-terms-input';
import { LeaseTenantsField } from './lease-tenants-field';
import { LeaseTermsFields } from './lease-terms-fields';

const SERVER_FIELD_ERRORS: FieldErrorRule<LeaseCreateValues>[] = [
  ...LEASE_TERMS_SERVER_ERRORS,
  {
    status: 400,
    bodyIncludes: 'tenant',
    field: 'tenants',
    message: 'Перевірте мешканців договору',
  },
];

// New lease for an apartment: terms + tenants in one POST.
export function LeaseCreateForm({ apartment }: { apartment: Apartment }) {
  const router = useRouter();
  const create = useCreateLease(apartment.id);
  const [saved, setSaved] = useState(false);

  const form = useForm<LeaseCreateValues>({
    resolver: zodResolver(leaseCreateSchema),
    defaultValues: { startDate: todayDateOnly(), endDate: '', rent: '', notes: '', tenants: [] },
  });
  const { isDirty, isSubmitting } = form.formState;
  const { confirmLeave, allowLeave, dialog } = useUnsavedChanges(isDirty && !saved);

  async function onSubmit(values: LeaseCreateValues) {
    try {
      const lease = await create.mutateAsync({
        ...leaseTermsInput(values),
        // The API's create DTO has no null: omit instead.
        endDate: values.endDate || undefined,
        notes: values.notes || undefined,
        tenants: values.tenants.map(({ tenantId, role }) => ({ tenantId, role })),
      });
      setSaved(true);
      allowLeave();
      toast.success('Договір створено');
      router.push(`/leases/${lease.id}?from=apartment`);
    } catch (error) {
      applyApiError(error, {
        setError: form.setError,
        fields: SERVER_FIELD_ERRORS,
        messages: { 409: 'Квартиру архівовано: новий договір створити не можна' },
      });
    }
  }

  function cancel() {
    confirmLeave(() => router.push(`/apartments/${apartment.id}?tab=leases`));
  }

  const busy = isSubmitting || saved;

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl">
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Умови</FieldLegend>
          <LeaseTermsFields control={form.control} idPrefix="lease-new" />
        </FieldSet>
        <FieldSet>
          <FieldLegend>Мешканці</FieldLegend>
          <Controller
            name="tenants"
            control={form.control}
            render={({ field, fieldState }) => (
              <LeaseTenantsField
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message ?? fieldState.error?.root?.message}
                idPrefix="lease-new"
              />
            )}
          />
        </FieldSet>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={cancel} disabled={busy}>
            Скасувати
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Збереження…' : 'Створити договір'}
          </Button>
        </div>
      </FieldGroup>
      {dialog}
    </form>
  );
}
