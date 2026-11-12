import { Inject, Injectable, Logger } from '@nestjs/common';
import { API_CLIENT, type ApiClient } from '../api/api-client.js';
import type { UploadResult } from './upload-outcome.js';

// Uploads one photo to the inbox (`POST /photos`, scope photos:upload). One request per photo: a rejected file
// (e.g. HEIC) mustn't fail the rest of an album. Never log headers (the key) or bodies (photo bytes).
@Injectable()
export class PhotoUploaderService {
  private readonly logger = new Logger(PhotoUploaderService.name);

  constructor(@Inject(API_CLIENT) private readonly api: ApiClient) {}

  async upload(bytes: Uint8Array<ArrayBuffer>, filename: string): Promise<UploadResult> {
    const form = new FormData();
    form.append('files', new Blob([bytes]), filename);
    const { data, error, response } = await this.api.POST('/photos', {
      // The typed body is a placeholder: the request body is the FormData above.
      body: { files: [] },
      bodySerializer: () => form,
    });
    if (data) {
      const [photo] = data;
      if (!photo) return { outcome: 'failed' };
      return { outcome: photo.duplicate ? 'duplicate' : 'accepted', photoId: photo.id };
    }
    // The OpenAPI document has no error schema (typed `never`): read the Nest error body as unknown.
    const body: unknown = error;
    const message =
      typeof body === 'object' && body !== null && 'message' in body ? String(body.message) : '';
    // Only the API's per-file errors (`files[i]: …` — type, corrupt image) are the user's file; any other 400 is ours.
    if (response.status === 400 && message.startsWith('files[')) return { outcome: 'unsupported' };
    if (response.status === 413) return { outcome: 'too-large' };
    if (response.status === 401 || response.status === 403) {
      // A retry can't help: the key is wrong, revoked or lacks the scope.
      this.logger.error(
        `Inbox upload refused: HTTP ${response.status} — check BOT_API_KEY and its scope photos:upload`,
      );
      return { outcome: 'unauthorized' };
    }
    this.logger.error(
      `Inbox upload failed: HTTP ${response.status}${message ? ` (${message})` : ''}`,
    );
    return { outcome: 'failed' };
  }
}
