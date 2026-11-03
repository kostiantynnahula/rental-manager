'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { applyApiError } from '@/lib/api/api-error';
import { useDeleteTariff, type TariffDetail } from '@/lib/api/queries/tariffs';
import { IN_USE_REASON } from './constants/labels';

const IN_USE = `${IN_USE_REASON} — його можна лише архівувати`;

// For a tariff added by mistake. Once attached to an apartment it's only archived; the API checks it too (409).
export function DeleteTariffButton({ tariff }: { tariff: TariffDetail }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const remove = useDeleteTariff(tariff.id);

  function confirm() {
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success('Тариф видалено');
        router.replace('/tariffs');
      },
      onError: (error) => {
        setOpen(false);
        applyApiError(error, { messages: { 409: IN_USE } });
      },
    });
  }

  return (
    <div className="space-y-1">
      <Button
        variant="destructive"
        className="w-full"
        disabled={tariff.inUse}
        aria-describedby={tariff.inUse ? 'delete-tariff-hint' : undefined}
        onClick={() => setOpen(true)}
      >
        <Trash2 />
        Видалити
      </Button>
      {/* Visible text, not a tooltip: a disabled button can't show one on touch screens. */}
      {tariff.inUse && (
        <p id="delete-tariff-hint" className="text-xs text-muted-foreground">
          {IN_USE}
        </p>
      )}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Видалити тариф?"
        description={`«${tariff.name}» і всю історію його цін буде видалено назавжди. Це для тарифу, доданого помилково.`}
        confirmLabel="Видалити"
        destructive
        pending={remove.isPending || remove.isSuccess}
        onConfirm={confirm}
      />
    </div>
  );
}
