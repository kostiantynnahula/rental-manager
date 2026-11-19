import { uploadErrorMessage as photoUploadErrorMessage } from '@/components/photos/helpers/upload-error-message';
import { serverMessages } from '@/lib/api/api-error';
import { ApiError } from '@/lib/api/errors';
import { UploadPartialError } from '@/lib/api/queries/condition-photos';

// Condition photo upload errors in Ukrainian; file errors (format, size, count) are the same as for meter photos.
export function uploadErrorMessage(error: unknown): string {
  if (error instanceof UploadPartialError) {
    return `Завантажено ${error.uploaded} з ${error.total}. ${uploadErrorMessage(error.reason)}`;
  }
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return serverMessages(error.body).some((m) => m.includes('archived'))
        ? 'Квартира в архіві — завантажити фото не можна'
        : 'Квартиру не знайдено';
    }
    if (error.status === 409) {
      return serverMessages(error.body).some((m) => m.includes('another apartment'))
        ? 'Це фото вже завантажене для іншої квартири'
        : 'Фото змінилося під час завантаження — спробуйте ще раз';
    }
  }
  return photoUploadErrorMessage(error);
}
