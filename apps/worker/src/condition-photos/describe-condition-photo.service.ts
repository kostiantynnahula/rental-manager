import { Injectable, Logger } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { WorkerApi } from '../api/worker-api.service.js';
import { ExtractionNotConfiguredError } from '../extraction/errors/extraction-not-configured.error.js';
import { ConditionPhotoDescriber } from './condition-photo-describer.service.js';

// One describe-condition-photo job: GET the file → the describer → PUT the description (→ DESCRIBED). The PUT is
// the job's output, so a refused one fails the job (unlike the meter parse result): 400/401/403/404 for good,
// others retried. A retry repeats the paid model call; the PUT itself is idempotent.
@Injectable()
export class DescribeConditionPhotoService {
  private readonly logger = new Logger(DescribeConditionPhotoService.name);

  constructor(
    private readonly api: WorkerApi,
    private readonly describer: ConditionPhotoDescriber,
  ) {}

  async run(photoId: string): Promise<void> {
    const image = await this.api.getConditionPhotoFile(photoId);
    const description = await this.describe(image);
    const res = await this.api.putConditionPhotoDescription(photoId, { description });
    if (!res.ok) {
      const detail = `PUT /condition-photos/${photoId}/description: HTTP ${res.status}${res.message ? ` (${res.message})` : ''}`;
      if (res.status === 401 || res.status === 403) {
        throw new UnrecoverableError(
          `${detail} — the key needs the condition-photos:describe scope`,
        );
      }
      if (res.status === 400 || res.status === 404) throw new UnrecoverableError(detail);
      throw new Error(detail);
    }
    this.logger.log(
      `condition photo ${photoId}: ${image.byteLength} bytes → ${description.room}, ` +
        `${description.items.length} items, described`,
    );
  }

  private async describe(image: Buffer) {
    try {
      return await this.describer.describe(image);
    } catch (e) {
      if (e instanceof ExtractionNotConfiguredError) throw new UnrecoverableError(e.message);
      throw e;
    }
  }
}
