import { apiErrorMessage, serverMessages } from '@/lib/api/api-error';
import { ApiError } from '@/lib/api/errors';

// Translates the API's errors of PATCH /photos/:id (assign an apartment) into Ukrainian.
export function assignErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return apiErrorMessage(error);
  if (error.status === 409) return 'Фото вже використане в показаннях — перенести його не можна';
  if (error.status === 400 && serverMessages(error.body).join(' ').includes('archived')) {
    return 'Квартира в архіві';
  }
  return apiErrorMessage(error);
}
