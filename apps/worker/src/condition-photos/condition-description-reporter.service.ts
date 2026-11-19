import { Injectable, Logger } from '@nestjs/common';
import { WorkerApi } from '../api/worker-api.service.js';

// SetConditionPhotoDescriptionDto.error limit.
const MAX_ERROR = 1000;

// Tells the API that a condition photo could not be described (→ FAILED + indexNote, shown in the web). Best
// effort: a failed report is only logged — it never retries the job (that would repeat the paid model call).
@Injectable()
export class ConditionDescriptionReporter {
  private readonly logger = new Logger(ConditionDescriptionReporter.name);

  constructor(private readonly api: WorkerApi) {}

  async reportFailure(photoId: string, error: string): Promise<void> {
    try {
      const res = await this.api.putConditionPhotoDescription(photoId, {
        // The API rejects an empty error (the photo would stay PENDING).
        error: truncate(error.trim() || 'Unknown error'),
      });
      if (res.ok) return;
      const hint =
        res.status === 401 || res.status === 403
          ? ' — the key needs the condition-photos:describe scope'
          : '';
      this.logger.warn(`condition photo ${photoId}: failure not saved (HTTP ${res.status})${hint}`);
    } catch (e) {
      this.logger.warn(`condition photo ${photoId}: failure not saved (${(e as Error).message})`);
    }
  }
}

function truncate(text: string): string {
  return text.length > MAX_ERROR ? `${text.slice(0, MAX_ERROR - 1)}…` : text;
}
