import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Вхід' };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <LoginForm />
    </main>
  );
}
