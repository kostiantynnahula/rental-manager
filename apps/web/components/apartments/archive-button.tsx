'use client';

import { Archive, ArchiveRestore } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { applyApiError } from '@/lib/api/api-error';
import {
  useArchiveApartment,
  useUnarchiveApartment,
  type Apartment,
} from '@/lib/api/queries/apartments';

export function ArchiveButton({ apartment }: { apartment: Apartment }) {
  const [open, setOpen] = useState(false);
  const archive = useArchiveApartment(apartment.id);
  const unarchive = useUnarchiveApartment(apartment.id);
  const archiving = apartment.isActive;
  const mutation = archiving ? archive : unarchive;

  function confirm() {
    mutation.mutate(undefined, {
      onSuccess: () => toast.success(archiving ? 'Квартиру архівовано' : 'Квартиру відновлено'),
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
        title={archiving ? 'Архівувати квартиру?' : 'Відновити квартиру?'}
        description={
          archiving
            ? 'Квартира зникне зі списку активних. Договори, лічильники й показання збережуться; відновити можна будь-коли.'
            : 'Квартира знову з’явиться у списку активних.'
        }
        confirmLabel={archiving ? 'Архівувати' : 'Відновити'}
        destructive={archiving}
        pending={mutation.isPending}
        onConfirm={confirm}
      />
    </>
  );
}
