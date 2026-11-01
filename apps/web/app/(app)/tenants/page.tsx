import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Мешканці' };

export default function TenantsPage() {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Мешканці</h1>
      <p className="text-muted-foreground">Тут буде список мешканців.</p>
    </section>
  );
}
