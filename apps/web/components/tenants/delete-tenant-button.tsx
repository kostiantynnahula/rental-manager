'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { applyApiError } from '@/lib/api/api-error';
import { useDeleteTenant, type Tenant } from '@/lib/api/queries/tenants';

const HAS_LEASES = 'Не можна видалити: є договори';

// Only tenants without lease history can be deleted. The API checks it too (409), e.g. if a lease was added
// in another tab after this page loaded.
export function DeleteTenantButton({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const remove = useDeleteTenant(tenant.id);
  const hasLeases = tenant.leases.length > 0;

  function confirm() {
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success('Мешканця видалено');
        router.replace('/tenants');
      },
      onError: (error) => {
        setOpen(false);
        applyApiError(error, { messages: { 409: HAS_LEASES } });
      },
    });
  }

  return (
    <div className="space-y-1">
      <Button
        variant="destructive"
        className="w-full"
        disabled={hasLeases}
        aria-describedby={hasLeases ? 'delete-tenant-hint' : undefined}
        onClick={() => setOpen(true)}
      >
        <Trash2 />
        Видалити
      </Button>
      {/* Visible text, not a tooltip: a disabled button can't show one on touch screens. */}
      {hasLeases && (
        <p id="delete-tenant-hint" className="text-xs text-muted-foreground">
          {HAS_LEASES}
        </p>
      )}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Видалити мешканця?"
        description={`${tenant.fullName} буде видалено назавжди.`}
        confirmLabel="Видалити"
        destructive
        pending={remove.isPending || remove.isSuccess}
        onConfirm={confirm}
      />
    </div>
  );
}
