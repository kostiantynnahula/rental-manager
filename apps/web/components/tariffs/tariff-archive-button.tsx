'use client';

import { Archive, ArchiveRestore } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { applyApiError } from '@/lib/api/api-error';
import { useArchiveTariff, useUnarchiveTariff, type TariffDetail } from '@/lib/api/queries/tariffs';

export function TariffArchiveButton({ tariff }: { tariff: TariffDetail }) {
  const [open, setOpen] = useState(false);
  const archive = useArchiveTariff(tariff.id);
  const unarchive = useUnarchiveTariff(tariff.id);
  const archiving = tariff.isActive;
  const mutation = archiving ? archive : unarchive;

  function confirm() {
    mutation.mutate(undefined, {
      onSuccess: () => toast.success(archiving ? 'Тариф архівовано' : 'Тариф відновлено'),
      onError: (error) => applyApiError(error),
      onSettled: () => setOpen(false),
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {archiving ? <Archive /> : <ArchiveRestore />}
        {archiving ? 'Архівувати' : 'Відновити'}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={archiving ? 'Архівувати тариф?' : 'Відновити тариф?'}
        description={
          archiving
            ? 'Тариф зникне зі списку активних, нові ціни додати буде не можна. Історія цін збережеться; відновити можна будь-коли.'
            : 'Тариф знову з’явиться у списку активних.'
        }
        confirmLabel={archiving ? 'Архівувати' : 'Відновити'}
        destructive={archiving}
        pending={mutation.isPending}
        onConfirm={confirm}
      />
    </>
  );
}
