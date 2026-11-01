import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ApartmentEdit } from '@/components/apartments/apartment-edit';
import { FormSkeleton } from '@/components/form-skeleton';

export const metadata: Metadata = { title: 'Редагування квартири' };

export default function EditApartmentPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Редагування квартири</h1>
      <Suspense fallback={<FormSkeleton fields={2} textarea />}>
        <ApartmentEdit />
      </Suspense>
    </section>
  );
}
