import type { Metadata } from 'next';
import { TenantFormPage } from '@/components/tenants/tenant-form-page';

export const metadata: Metadata = { title: 'Новий мешканець' };

export default function NewTenantPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Новий мешканець</h1>
      <TenantFormPage />
    </section>
  );
}
