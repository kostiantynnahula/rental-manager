'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import { meQueryKey } from '@/lib/auth/queries';
import { safeNextPath } from '@/lib/auth/redirect';
import { getQueryClient } from '@/lib/query-client';

const loginSchema = z.object({
  email: z.email('Введіть коректний email'),
  password: z.string().min(1, 'Введіть пароль'),
});

type LoginValues = z.infer<typeof loginSchema>;

function loginErrorMessage(status: number): string {
  if (status === 401) return 'Невірний email або пароль';
  if (status === 429) return 'Забагато спроб. Спробуйте за хвилину';
  return 'Не вдалося увійти. Спробуйте ще раз';
}

export function LoginForm() {
  const router = useRouter();
  // Stays true after success so the button doesn't re-enable while the next page loads.
  const [redirecting, setRedirecting] = useState(false);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { isSubmitting, errors } = form.formState;

  async function onSubmit(values: LoginValues) {
    try {
      const { data, response } = await api.POST('/auth/login', { body: values });
      if (!response.ok || !data) {
        form.setError('root', { message: loginErrorMessage(response.status) });
        return;
      }
      setRedirecting(true);
      getQueryClient().setQueryData(meQueryKey, data);
      // Read ?next at submit time instead of useSearchParams(): keeps the page fully static
      // (no Suspense boundary needed under cacheComponents).
      router.replace(safeNextPath(new URLSearchParams(window.location.search).get('next')));
    } catch {
      form.setError('root', { message: 'Немає з’єднання з сервером. Спробуйте ще раз' });
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Вхід</CardTitle>
        <CardDescription>Rental Manager</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="login-email">Email</FieldLabel>
                  <Input
                    {...field}
                    id="login-email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="login-password">Пароль</FieldLabel>
                  <Input
                    {...field}
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            {errors.root && (
              <p role="alert" className="text-sm text-destructive">
                {errors.root.message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting || redirecting}>
              {isSubmitting || redirecting ? 'Вхід…' : 'Увійти'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
