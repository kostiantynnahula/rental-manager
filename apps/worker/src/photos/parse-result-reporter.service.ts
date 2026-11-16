import { Injectable, Logger } from '@nestjs/common';
import type { components } from '../api/schema.js';
import { WorkerApi } from '../api/worker-api.service.js';

type ParseResult = components['schemas']['PhotoParseResult'];

// SetParseResultDto.note limit.
const MAX_NOTE = 1000;

// Tells the API how a photo's parse job ended (PUT /photos/{id}/parse-result → Photo.parseStatus, shown in the web).
// Best effort: a failed report is only logged — it never fails or retries the job (a retry would repeat the paid
// model call just for a status).
@Injectable()
export class ParseResultReporter {
  private readonly logger = new Logger(ParseResultReporter.name);

  constructor(private readonly api: WorkerApi) {}

  async report(photoId: string, status: ParseResult, note?: string): Promise<void> {
    try {
      const res = await this.api.putParseResult(photoId, status, note && truncate(note));
      if (res.ok) return;
      const hint =
        res.status === 401 || res.status === 403
          ? ' — the key needs the photos:parse-result scope'
          : '';
      this.logger.warn(
        `photo ${photoId}: parse result ${status} not saved (HTTP ${res.status})${hint}`,
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
