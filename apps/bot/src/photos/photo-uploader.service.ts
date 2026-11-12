import { Inject, Injectable, Logger } from '@nestjs/common';
import { API_CLIENT, type ApiClient } from '../api/api-client.js';
import type { UploadOutcome } from './upload-outcome.js';

// Uploads one photo to the inbox (`POST /photos`, scope photos:upload). One request per photo: a rejected file
// (e.g. HEIC) mustn't fail the rest of an album. Never log headers (the key) or bodies (photo bytes).
@Injectable()
export class PhotoUploaderService {
  private readonly logger = new Logger(PhotoUploaderService.name);

  constructor(@Inject(API_CLIENT) private readonly api: ApiClient) {}

  async upload(bytes: Buffer, filename: string): Promise<UploadOutcome> {
    const form = new FormData();
    form.append('files', new Blob([new Uint8Array(bytes)]), filename);
    const { data, response } = await this.api.POST('/photos', {
      // The typed body is a placeholder: the request body is the FormData above.
      body: { files: [] },
      bodySerializer: () => form,
    });
    if (data) return data[0]?.duplicate ? 'duplicate' : 'accepted';
    if (response.status === 400) return 'unsupported';
    if (response.status === 413) return 'too-large';
    this.logger.error(`Inbox upload failed: HTTP ${response.status}`);
    return 'failed';
  }
}
