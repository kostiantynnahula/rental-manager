import { Inject, Injectable, Logger } from '@nestjs/common';
import { API_CLIENT, type ApiClient } from '../api/api-client.js';
import type { components } from '../api/schema.js';

type ParseResult = components['schemas']['PhotoParseResult'];

// SetParseResultDto.note limit.
const MAX_NOTE = 1000;

// Tells the API how a photo's parse job ended (PUT /photos/{id}/parse-result → Photo.parseStatus, shown in the web).
// Best effort: a failed report is only logged — it never fails or retries the job (a retry would repeat the paid
// model call just for a status).
@Injectable()
export class ParseResultReporter {
  private readonly logger = new Logger(ParseResultReporter.name);

  constructor(@Inject(API_CLIENT) private readonly api: ApiClient) {}

  async report(photoId: string, status: ParseResult, note?: string): Promise<void> {
    try {
      const res = await this.api.PUT('/photos/{id}/parse-result', {
        params: { path: { id: photoId } },
        body: { status, note: note && truncate(note) },
      });
      if (res.response.ok) return;
      const hint =
        res.response.status === 401 || res.response.status === 403
          ? ' — the key needs the photos:parse-result scope'
          : '';
      this.logger.warn(
        `photo ${photoId}: parse result ${status} not saved (HTTP ${res.response.status})${hint}`,
      );
    } catch (e) {
      this.logger.warn(
        `photo ${photoId}: parse result ${status} not saved (${(e as Error).message})`,
      );
    }
  }
}

function truncate(note: string): string {
  return note.length > MAX_NOTE ? `${note.slice(0, MAX_NOTE - 1)}…` : note;
}
