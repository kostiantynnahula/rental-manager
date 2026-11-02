'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { applyApiError } from '@/lib/api/api-error';
import { useDeleteLease, type Lease } from '@/lib/api/queries/leases';

// Deletes a lease entered by mistake (allowed until statements exist). Ending is the normal way out.
export function DeleteLeaseButton({ lease, backHref }: { lease: Lease; backHref: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const remove = useDeleteLease(lease.id);

  function confirm() {
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success('Договір видалено');
        router.replace(backHref);
      },
      onError: (error) => {
        setOpen(false);
        applyApiError(error);
      },
    });
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 />
        Видалити
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Видалити договір?"
        description="Договір і прив’язку мешканців буде видалено назавжди. Якщо оренда просто закінчилась — краще «Завершити»."
        confirmLabel="Видалити"
        destructive
        pending={remove.isPending || remove.isSuccess}
        onConfirm={confirm}
      />
    </>
  );
}
