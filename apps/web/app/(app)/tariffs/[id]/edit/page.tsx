import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormSkeleton } from '@/components/form-skeleton';
import { TariffEdit } from '@/components/tariffs/tariff-edit';

export const metadata: Metadata = { title: 'Редагування тарифу' };

export default function EditTariffPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Редагування тарифу</h1>
      <Suspense fallback={<FormSkeleton fields={3} textarea />}>
        <TariffEdit />
      </Suspense>
    </section>
  );
}
