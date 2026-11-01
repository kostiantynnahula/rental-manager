'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import type { TenantRecord } from '@/lib/api/queries/tenants';
import { TenantForm } from './tenant-form';

// TenantForm as a page: unsaved-changes guard, toast and redirect to the detail page after saving.
export function TenantFormPage({ tenant }: { tenant?: TenantRecord }) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const { confirmLeave, allowLeave, dialog } = useUnsavedChanges(dirty);

  function onSuccess(saved: TenantRecord, { apartmentName }: { apartmentName?: string }) {
    allowLeave();
    toast.success(apartmentName ? `Мешканця додано до ${apartmentName}` : 'Мешканця збережено');
    router.push(`/tenants/${saved.id}`);
  }

  function cancel() {
    confirmLeave(() => {
      // Opened directly (no history in this tab) → go to a sensible parent instead of leaving the app.
      if (window.history.length > 1) router.back();
      else router.push(tenant ? `/tenants/${tenant.id}` : '/tenants');
    });
  }

  return (
    <>
      <TenantForm
        tenant={tenant}
        onSuccess={onSuccess}
        onCancel={cancel}
        onDirtyChange={setDirty}
      />
      {dialog}
    </>
  );
}
