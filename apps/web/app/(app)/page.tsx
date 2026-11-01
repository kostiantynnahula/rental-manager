import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Квартири' };

export default function ApartmentsPage() {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Квартири</h1>
      <p className="text-muted-foreground">Тут буде список квартир.</p>
    </section>
  );
}
