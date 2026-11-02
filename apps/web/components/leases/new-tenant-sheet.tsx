'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { TenantForm } from '@/components/tenants/tenant-form';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { TenantRecord } from '@/lib/api/queries/tenants';

// "Створити нового мешканця": TenantForm (no assignment section) in a Sheet; the created tenant goes to onCreated.
export function NewTenantSheet({ onCreated }: { onCreated: (tenant: TenantRecord) => void }) {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  // A fresh form every time the sheet opens.
  const [formKey, setFormKey] = useState(0);

  function openSheet() {
    setFormKey((k) => k + 1);
    setDirty(false);
    setOpen(true);
  }

  function requestClose() {
    if (dirty) setConfirmClose(true);
    else setOpen(false);
  }

  return (
    <>
      <Button type="button" variant="outline" className="w-full justify-start" onClick={openSheet}>
        <Plus />
        Створити нового мешканця
      </Button>
      <Sheet open={open} onOpenChange={(next) => (next ? setOpen(true) : requestClose())}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Новий мешканець</SheetTitle>
            <SheetDescription>Після збереження мешканця буде додано до договору.</SheetDescription>
          </SheetHeader>
          {/* The sheet is portalled out of the lease <form> in the DOM, but React still bubbles `submit` through
              portals to the lease form's onSubmit. Stop it here so saving the tenant never submits the lease. */}
          <div className="px-4 pb-4" onSubmit={(e) => e.stopPropagation()}>
            <TenantForm
              key={formKey}
              idPrefix="sheet-tenant"
              allowAssignment={false}
              onDirtyChange={setDirty}
              onCancel={requestClose}
              onSuccess={(tenant) => {
                toast.success(`${tenant.fullName}: мешканця створено`);
                onCreated(tenant);
                setDirty(false);
                setOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Незбережені зміни"
        description="Дані нового мешканця буде втрачено. Закрити?"
        confirmLabel="Закрити"
        cancelLabel="Залишитися"
        destructive
        onConfirm={() => {
          setConfirmClose(false);
          setDirty(false);
          setOpen(false);
        }}
      />
    </>
  );
}
