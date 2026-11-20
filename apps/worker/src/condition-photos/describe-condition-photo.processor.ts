import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  CONDITION_PHOTO_QUEUE,
  DESCRIBE_CONDITION_PHOTO_JOB,
  type DescribeConditionPhotoJobData,
} from '@rental/shared';
import { type Job, UnrecoverableError } from 'bullmq';
import { ConditionDescriptionReporter } from './condition-description-reporter.service.js';
import { DescribeConditionPhotoService } from './describe-condition-photo.service.js';

// Consumes the `condition-photos` queue (contract in @rental/shared); dispatches on the job name.
// Concurrency 1 (the default): a rate-limited model, and a check-in of 40 photos is fine in a few minutes.
@Processor(CONDITION_PHOTO_QUEUE)
export class DescribeConditionPhotoProcessor extends WorkerHost {
  private readonly logger = new Logger(DescribeConditionPhotoProcessor.name);

  constructor(
    private readonly describePhoto: DescribeConditionPhotoService,
    private readonly results: ConditionDescriptionReporter,
  ) {
    super();
  }

  async process(job: Job<DescribeConditionPhotoJobData>): Promise<void> {
    if (job.name !== DESCRIBE_CONDITION_PHOTO_JOB) {
      throw new UnrecoverableError(`Unknown job ${job.name}`);
    }
    await this.describePhoto.run(job.data.photoId);
  }

  // As ParsePhotoProcessor: log every failure; after the last attempt (or an unrecoverable one) the photo is marked
  // FAILED with the error (statuses and API messages only — no key, no photo bytes).
  @OnWorkerEvent('failed')
  async onFailed(job: Job<DescribeConditionPhotoJobData> | undefined, error: Error): Promise<void> {
    const retry =
      error instanceof UnrecoverableError ? 'no retry' : `attempt ${job?.attemptsMade ?? '?'}`;
    this.logger.error(
      `${job?.name ?? 'job'} ${job?.id ?? '?'} failed (${retry}): ${error.message}`,
    );
    const final =
      error instanceof UnrecoverableError || (job?.attemptsMade ?? 0) >= (job?.opts.attempts ?? 1);
    const photoId = job?.data.photoId;
    if (job?.name === DESCRIBE_CONDITION_PHOTO_JOB && photoId && final) {
      await this.results.reportFailure(photoId, error.message);
    }
  }
}
