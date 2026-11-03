import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormSkeleton } from '@/components/form-skeleton';
import { TariffCreate } from '@/components/tariffs/tariff-create';

export const metadata: Metadata = { title: 'Новий тариф' };

// Suspense: TariffCreate reads ?apartmentId= (useSearchParams), unknown at prerender time.
export default function NewTariffPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Новий тариф</h1>
      <Suspense fallback={<FormSkeleton fields={4} textarea />}>
        <TariffCreate />
      </Suspense>
    </section>
  );
}
