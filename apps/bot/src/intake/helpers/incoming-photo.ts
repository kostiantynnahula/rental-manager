import type { Message } from 'grammy/types';
import type { IncomingPhoto } from '../interfaces/incoming-photo.interface.js';

// The photo a message carries: a compressed photo (largest size — Telegram lists them smallest first) or an image
// sent as a file (original quality). null = not an image (e.g. a PDF). The API decides the real type from the
// content, so the filename is only metadata.
export function incomingPhoto(message: Message): IncomingPhoto | null {
  const largest = message.photo?.at(-1);
  if (largest) {
    return {
      fileId: largest.file_id,
      fileSize: largest.file_size,
      filename: `photo-${largest.file_unique_id}.jpg`,
      displayName: null,
    };
  }
  const doc = message.document;
  if (doc?.mime_type?.startsWith('image/')) {
    return {
      fileId: doc.file_id,
      fileSize: doc.file_size,
      filename: doc.file_name ?? `file-${doc.file_unique_id}`,
      displayName: doc.file_name ?? null,
    };
  }
  return null;
}
