import type { Metadata } from 'next';
import { ApartmentForm } from '@/components/apartments/apartment-form';

export const metadata: Metadata = { title: 'Нова квартира' };

export default function NewApartmentPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Нова квартира</h1>
      <ApartmentForm />
    </section>
  );
}
