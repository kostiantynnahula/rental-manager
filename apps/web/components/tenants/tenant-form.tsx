'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { applyApiError, type FieldErrorRule } from '@/lib/api/api-error';
import { ApiError } from '@/lib/api/errors';
import { apartmentKeys } from '@/lib/api/queries/apartments';
import { useCreateTenant, useUpdateTenant, type TenantRecord } from '@/lib/api/queries/tenants';
import { todayDateOnly } from '@/lib/format';
import { formatPhone, normalizeUaPhone } from '@/lib/phone';
import { PHONE_HINT, TENANT_NAME_MAX } from './constants/form';
import { tenantFormSchema, type TenantFormValues } from './helpers/tenant-form-schema';
import { toAssignmentInput } from './helpers/to-assignment-input';
import { useAssignmentTarget } from './hooks/use-assignment-target';
import { TenantAssignmentSection } from './tenant-assignment-section';

const SERVER_FIELD_ERRORS: FieldErrorRule<TenantFormValues>[] = [
  { status: 400, bodyIncludes: 'phone', field: 'phone', message: PHONE_HINT },
  { status: 400, bodyIncludes: 'email', field: 'email', message: 'Невірний email' },
  {
    status: 400,
    bodyIncludes: 'Unknown apartment',
    field: 'assignment.apartmentId',
    message: 'Квартиру не знайдено',
  },
  {
    status: 400,
    bodyIncludes: 'Unknown lease',
    field: 'assignment.apartmentId',
    message: 'Договір не знайдено, оновіть дані',
  },
  {
    status: 409,
    bodyIncludes: 'overlap',
    field: 'assignment.startDate',
    message: 'Дати перетинаються з іншим договором цієї квартири',
  },
  {
    status: 409,
    bodyIncludes: 'not current',
    field: 'assignment.apartmentId',
    message: 'Договір уже не активний — перевірте квартиру ще раз',
  },
  {
    status: 409,
    bodyIncludes: 'archived',
    field: 'assignment.apartmentId',
    message: 'Квартиру архівовано',
  },
];

const EMPTY_ASSIGNMENT: TenantFormValues['assignment'] = {
  apartmentId: '',
  mode: '',
  leaseId: '',
  startDate: '',
  rent: '',
  notes: '',
};

interface TenantFormProps {
  // Edit when given, create otherwise.
  tenant?: TenantRecord;
  // `apartmentName` is set when the new tenant was assigned to an apartment.
  onSuccess: (tenant: TenantRecord, info: { apartmentName?: string }) => void;
  // No Cancel button when omitted (e.g. a dialog with its own close button).
  onCancel?: () => void;
  // Lets the caller guard unsaved changes (a page) or a dialog close.
  onDirtyChange?: (dirty: boolean) => void;
  // Input id prefix: keeps ids unique when the form is open on a page and in a dialog at once.
  idPrefix?: string;
  // Create only: show "Прив’язати до квартири". The lease form embeds this form with false.
  allowAssignment?: boolean;
}

// Reusable: no router, toast or unsaved-changes logic here. The caller (page or dialog) decides what happens
// after a save or on cancel.
export function TenantForm({
  tenant,
  onSuccess,
  onCancel,
  onDirtyChange,
  idPrefix = 'tenant',
  allowAssignment = true,
}: TenantFormProps) {
  const queryClient = useQueryClient();
  const create = useCreateTenant();
  const update = useUpdateTenant(tenant?.id ?? '');
  // Keeps the buttons disabled after a successful save while the caller navigates away / closes.
  const [saved, setSaved] = useState(false);

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      fullName: tenant?.fullName ?? '',
      phone: tenant ? formatPhone(tenant.phone) : '',
      email: tenant?.email ?? '',
      notes: tenant?.notes ?? '',
      assignment: { ...EMPTY_ASSIGNMENT, startDate: todayDateOnly() },
    },
  });
  const showAssignment = allowAssignment && !tenant;
  const target = useAssignmentTarget(form.control, form.setValue);
  const { isDirty, isSubmitting } = form.formState;

  useEffect(() => {
    onDirtyChange?.(isDirty && !saved);
  }, [isDirty, saved, onDirtyChange]);

  async function onSubmit(values: TenantFormValues) {
    // Validated by the schema, so normalization can't fail here.
    const phone = normalizeUaPhone(values.phone) ?? values.phone;
    const assignment = showAssignment ? toAssignmentInput(values.assignment) : undefined;
    try {
      const result = tenant
        ? // null clears email/notes; create simply omits them.
          await update.mutateAsync({
            fullName: values.fullName,
            phone,
            email: values.email || null,
            notes: values.notes || null,
          })
        : await create.mutateAsync({
            fullName: values.fullName,
            phone,
            ...(values.email && { email: values.email }),
            ...(values.notes && { notes: values.notes }),
            ...(assignment && { assignment }),
          });
      setSaved(true);
      onSuccess(result, { apartmentName: assignment ? target.apartment?.name : undefined });
    } catch (error) {
      // The apartment's lease changed since it was loaded (ended, created elsewhere…): reload the preview.
      if (assignment && error instanceof ApiError && error.status === 409)
        void queryClient.invalidateQueries({
          queryKey: apartmentKeys.detail(values.assignment.apartmentId),
        });
      applyApiError(error, { setError: form.setError, fields: SERVER_FIELD_ERRORS });
    }
  }

  const busy = isSubmitting || saved;
  const waitingForLease = showAssignment && target.pending;

  function clearAssignment() {
    // Keep the start-date default for the next pick; clears errors of the block too.
    form.setValue(
      'assignment',
      { ...EMPTY_ASSIGNMENT, startDate: todayDateOnly() },
      { shouldDirty: true },
    );
    form.clearErrors('assignment');
  }
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl">
      <FieldGroup>
        <Controller
          name="fullName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={id('name')}>Ім’я</FieldLabel>
              <Input
                {...field}
                id={id('name')}
                placeholder="Іван Петренко"
                autoComplete="name"
                maxLength={TENANT_NAME_MAX}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="phone"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={id('phone')}>Телефон</FieldLabel>
              <Input
                {...field}
                // Show a valid number in one consistent format once the user leaves the field.
                onBlur={() => {
                  const normalized = normalizeUaPhone(field.value);
                  if (normalized) field.onChange(formatPhone(normalized));
                  field.onBlur();
                }}
                id={id('phone')}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="067 123 45 67"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <FieldDescription>Лише українські номери</FieldDescription>
              )}
            </Field>
          )}
        />
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={id('email')}>Email</FieldLabel>
              <Input
                {...field}
                id={id('email')}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Необов’язково"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="notes"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={id('notes')}>Нотатки</FieldLabel>
              <Textarea {...field} id={id('notes')} rows={4} aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {showAssignment && (
          <TenantAssignmentSection
            control={form.control}
            target={target}
            onClear={clearAssignment}
            idPrefix={idPrefix}
          />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
              Скасувати
            </Button>
          )}
          <Button type="submit" disabled={busy || waitingForLease}>
            {busy ? 'Збереження…' : 'Зберегти'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
