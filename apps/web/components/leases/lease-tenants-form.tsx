'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { applyApiError } from '@/lib/api/api-error';
import { useReplaceLeaseTenants, type Lease } from '@/lib/api/queries/leases';
import { leaseTenantsSchema, type LeaseTenantValue } from './helpers/lease-tenants-schema';
import { LeaseTenantsField } from './lease-tenants-field';

const schema = z.object({ tenants: leaseTenantsSchema });
type Values = z.infer<typeof schema>;

function tenantsValues(lease: Lease): Values {
  return {
    tenants: lease.tenants.map((t): LeaseTenantValue => ({
      tenantId: t.tenantId,
      fullName: t.fullName,
      phone: t.phone,
      role: t.role,
    })),
  };
}

interface LeaseTenantsFormProps {
  lease: Lease;
  onDirtyChange: (dirty: boolean) => void;
}

// Edit page, section "Мешканці" → PUT (replaces the whole list). Saved independently of the terms section.
export function LeaseTenantsForm({ lease, onDirtyChange }: LeaseTenantsFormProps) {
  const replace = useReplaceLeaseTenants(lease.id);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: tenantsValues(lease),
  });
  const { isDirty, isSubmitting } = form.formState;

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  async function onSubmit(values: Values) {
    try {
      const saved = await replace.mutateAsync(
        values.tenants.map(({ tenantId, role }) => ({ tenantId, role })),
      );
      form.reset(tenantsValues(saved));
      toast.success('Мешканців збережено');
    } catch (error) {
      applyApiError(error, {
        setError: form.setError,
        fields: [{ status: 400, field: 'tenants', message: 'Перевірте мешканців договору' }],
      });
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name="tenants"
          control={form.control}
          render={({ field, fieldState }) => (
            <LeaseTenantsField
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message ?? fieldState.error?.root?.message}
              idPrefix="lease-edit"
            />
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty || isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Збереження…' : 'Зберегти мешканців'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
