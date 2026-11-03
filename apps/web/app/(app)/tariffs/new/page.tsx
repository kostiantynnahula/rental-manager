import type { Metadata } from 'next';
import { TariffForm } from '@/components/tariffs/tariff-form';

export const metadata: Metadata = { title: 'Новий тариф' };

export default function NewTariffPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Новий тариф</h1>
      <TariffForm />
    </section>
  );
}
