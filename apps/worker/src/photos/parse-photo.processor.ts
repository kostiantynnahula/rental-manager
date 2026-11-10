import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { PARSE_PHOTO_JOB, PHOTO_QUEUE, type ParsePhotoJobData } from '@rental/shared';
import { type Job, UnrecoverableError } from 'bullmq';
import { ParsePhotoService } from './parse-photo.service.js';
import { ParseResultReporter } from './parse-result-reporter.service.js';

// Consumes the `photos` queue (contract in @rental/shared); dispatches on the job name.
// Concurrency 1: photos are few, and the parser will call a rate-limited LLM.
@Processor(PHOTO_QUEUE)
export class ParsePhotoProcessor extends WorkerHost {
  private readonly logger = new Logger(ParsePhotoProcessor.name);

  constructor(
    private readonly parsePhoto: ParsePhotoService,
    private readonly results: ParseResultReporter,
  ) {
    super();
  }

  async process(job: Job<ParsePhotoJobData>): Promise<void> {
    if (job.name !== PARSE_PHOTO_JOB) throw new UnrecoverableError(`Unknown job ${job.name}`);
    await this.parsePhoto.run(job.data.photoId);
  }

  // BullMQ records the failure in Redis only; log it too. `attemptsMade` counts this attempt. After the last one
  // the photo is marked FAILED (our errors carry only statuses and API messages — no key, no photo bytes); for a
  // deleted photo the report just gets a 404, logged.
  @OnWorkerEvent('failed')
  async onFailed(job: Job<ParsePhotoJobData> | undefined, error: Error): Promise<void> {
    const retry =
      error instanceof UnrecoverableError ? 'no retry' : `attempt ${job?.attemptsMade ?? '?'}`;
    this.logger.error(
      `${job?.name ?? 'job'} ${job?.id ?? '?'} failed (${retry}): ${error.message}`,
    );
    const final =
      error instanceof UnrecoverableError || (job?.attemptsMade ?? 0) >= (job?.opts.attempts ?? 1);
    const photoId = job?.data.photoId;
    if (job?.name === PARSE_PHOTO_JOB && photoId && final) {
      await this.results.report(photoId, 'FAILED', error.message);
    }
  }
}
