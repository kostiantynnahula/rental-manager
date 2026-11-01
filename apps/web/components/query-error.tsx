'use client';

import { Button } from '@/components/ui/button';
import { apiErrorMessage } from '@/lib/api/api-error';

export function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
    >
      <p>Не вдалося завантажити дані. {apiErrorMessage(error)}</p>
      <Button variant="outline" onClick={onRetry}>
        Спробувати ще раз
      </Button>
    </div>
  );
}
