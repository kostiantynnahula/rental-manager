'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useState } from 'react';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormSheet } from '@/components/form-sheet';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { applyApiError } from '@/lib/api/api-error';
import { useCancelStatement, type Statement } from '@/lib/api/queries/statements';
import { formatPeriod } from '@/lib/format';

const schema = z.object({
  note: z.string().max(500, 'Не більше 500 символів'),
});
type Values = z.infer<typeof schema>;

interface CancelStatementSheetProps {
  statement: Statement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Optional note, then a confirmation: cancelling can't be undone (only issued again).
export function CancelStatementSheet({ statement, open, onOpenChange }: CancelStatementSheetProps) {
  const cancel = useCancelStatement();
  const [confirming, setConfirming] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { note: '' } });

  async function confirm() {
    const note = form.getValues('note').trim();
    try {
      await cancel.mutateAsync({
        id: statement.id,
        apartmentId: statement.apartmentId,
        period: statement.period,
        note: note || undefined,
      });
      toast.success('Рахунок скасовано');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, { messages: { 409: 'Рахунок уже скасовано' } });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Скасувати рахунок"
      description={`Рахунок за ${formatPeriod(statement.period)} лишиться в історії, а за цей місяць можна буде виставити новий.`}
    >
      <form noValidate onSubmit={form.handleSubmit(() => setConfirming(true))}>
        <FieldGroup>
          <Controller
            name="note"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="cancel-statement-note">Примітка (необов’язково)</FieldLabel>
                <Textarea
                  {...field}
                  id="cancel-statement-note"
                  maxLength={500}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Button type="submit" variant="destructive">
            Скасувати рахунок
          </Button>
        </FieldGroup>
      </form>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Скасувати рахунок?"
        description="Цю дію не можна відмінити."
        confirmLabel="Скасувати рахунок"
        cancelLabel="Назад"
        destructive
        pending={cancel.isPending}
        onConfirm={() => void confirm()}
      />
    </FormSheet>
  );
}
