'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { applyApiError } from '@/lib/api/api-error';
import { useUpdateLease, type Lease } from '@/lib/api/queries/leases';
import { parseMoney } from '@/lib/format';
import { RENT_CHANGE_WARNING } from './constants/messages';
import { LEASE_TERMS_SERVER_ERRORS } from './constants/server-errors';
import { leaseTermsInput } from './helpers/lease-terms-input';
import { leaseTermsSchema, type LeaseTermsValues } from './helpers/lease-terms-schema';
import { rentToInput } from './helpers/rent-to-input';
import { LeaseTermsFields } from './lease-terms-fields';

function termsValues(lease: Lease): LeaseTermsValues {
  return {
    startDate: lease.startDate,
    endDate: lease.endDate ?? '',
    rent: rentToInput(lease.monthlyRent),
    notes: lease.notes ?? '',
  };
}

interface LeaseTermsFormProps {
  lease: Lease;
  onDirtyChange: (dirty: boolean) => void;
}

// Edit page, section "Умови" → PATCH. Saved independently of the tenants section.
export function LeaseTermsForm({ lease, onDirtyChange }: LeaseTermsFormProps) {
  const update = useUpdateLease(lease.id);
  const form = useForm<LeaseTermsValues>({
    resolver: zodResolver(leaseTermsSchema),
    defaultValues: termsValues(lease),
  });
  const { isDirty, isSubmitting } = form.formState;
  const rent = useWatch({ control: form.control, name: 'rent' });
  const rentChanged = parseMoney(rent) !== null && parseMoney(rent) !== lease.monthlyRent;

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  async function onSubmit(values: LeaseTermsValues) {
    try {
      const saved = await update.mutateAsync(leaseTermsInput(values));
      // The saved values become the new baseline: the section is clean again, the page stays open.
      form.reset(termsValues(saved));
      toast.success('Умови збережено');
    } catch (error) {
      applyApiError(error, { setError: form.setError, fields: LEASE_TERMS_SERVER_ERRORS });
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <LeaseTermsFields
          control={form.control}
          idPrefix="lease-edit"
          rentWarning={
            rentChanged && (
              <p
                role="status"
                className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {RENT_CHANGE_WARNING}
              </p>
            )
          }
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty || isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Збереження…' : 'Зберегти умови'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
