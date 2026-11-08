import { apiErrorMessage, serverMessages } from '@/lib/api/api-error';
import { ApiError } from '@/lib/api/errors';
import { PHOTO_MAX_FILE_SIZE_MB, PHOTO_MAX_FILES } from '../constants/upload';

// Translates the API's upload errors (photos service + multer limits) into Ukrainian.
export function uploadErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return apiErrorMessage(error);
  const text = serverMessages(error.body).join(' ');
  switch (error.status) {
    case 400:
      if (text.includes('HEIC')) return 'Формат HEIC не підтримується — надішліть фото як JPEG';
      if (text.includes('Unsupported file type')) {
        return 'Непідтримуваний формат файлу. Можна JPEG, PNG або WebP';
      }
      if (text.includes('corrupt')) return 'Файл пошкоджений або це не фото';
      if (text.includes('archived')) return 'Квартира в архіві — завантажити фото не можна';
      if (text.includes('Too many files'))
        return `Забагато файлів за раз — не більше ${PHOTO_MAX_FILES}`;
      break;
    case 413:
      return `Файл завеликий — не більше ${PHOTO_MAX_FILE_SIZE_MB} МБ`;
    case 409:
      return 'Це фото вже завантажене для іншої квартири';
  }
  return apiErrorMessage(error);
}
