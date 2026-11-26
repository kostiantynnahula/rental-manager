import { APICallError } from 'ai';

// useChat's error → the text under the conversation. HTTP errors come before the stream (APICallError with the
// status); a failure mid-stream is the API's own Ukrainian error part (api-chat.md → Flow 5), shown as is.
export function chatErrorMessage(error: Error): string {
  if (APICallError.isInstance(error)) {
    switch (error.statusCode) {
      case 404:
        return 'Чат не знайдено';
      case 409:
        return 'Відповідь на попереднє питання ще готується. Зачекайте трохи';
      case 503:
        return 'Чат недоступний: на сервері не налаштовано ключ моделі';
      case 400:
        return 'Питання порожнє або задовге';
      case 429:
        return 'Забагато запитів. Спробуйте за хвилину';
    }
    return 'Помилка сервера. Спробуйте ще раз';
  }
  // fetch itself failed (offline): a TypeError, no status.
  if (error instanceof TypeError) return 'Немає з’єднання з сервером. Спробуйте ще раз';
  return error.message;
}
