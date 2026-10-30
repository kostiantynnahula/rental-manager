import { fileTypeFromBuffer } from 'file-type';
import type { ImageTypeResult } from '../interfaces/image-type.interface.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
// Recognised but not accepted yet: our sharp build can't decode HEVC.
const HEIC_MIME_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]);

// From the content (magic bytes) only: the client's Content-Type and filename are ignored.
export async function detectImageType(buffer: Buffer): Promise<ImageTypeResult> {
  const detected = await fileTypeFromBuffer(buffer);
  if (detected && ALLOWED_MIME_TYPES.has(detected.mime)) {
    return { ok: true, type: { mime: detected.mime, ext: detected.ext } };
  }
  if (detected && HEIC_MIME_TYPES.has(detected.mime)) {
    return { ok: false, message: 'HEIC is not supported yet — send the photo as JPEG' };
  }
  return { ok: false, message: 'Unsupported file type; allowed: JPEG, PNG, WebP' };
}
