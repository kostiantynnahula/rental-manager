import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import {
  CONDITION_PHOTO_QUEUE,
  DESCRIBE_CONDITION_PHOTO_JOB,
  type DescribeConditionPhotoJobData,
} from '@rental/shared';
import { Queue } from 'bullmq';
import { withTimeout } from './helpers/with-timeout.js';

const DAY_SECONDS = 24 * 60 * 60;

// As in PhotoJobsService: BullMQ waits for Redis without a limit, so the upload request would hang.
const ENQUEUE_TIMEOUT_MS = 3_000;

// api → worker: describe a condition photo (its own queue, so a big check-in doesn't delay meter parsing).
@Injectable()
export class ConditionPhotoJobsService {
  private readonly logger = new Logger(ConditionPhotoJobsService.name);

  constructor(
    @InjectQueue(CONDITION_PHOTO_QUEUE)
    private readonly queue: Queue<DescribeConditionPhotoJobData>,
  ) {}

  // Never throws: a queue outage must not fail the upload (the photo just stays PENDING).
  async enqueueDescribe(photoId: string): Promise<void> {
    try {
      const added = this.queue.add(
        DESCRIBE_CONDITION_PHOTO_JOB,
        { photoId },
        {
          // BullMQ ignores a job whose id already exists: one upload job per photo.
          jobId: photoId,
          attempts: 5,
          backoff: { type: 'exponential', delay: 10_000 },
          removeOnComplete: { age: 7 * DAY_SECONDS },
          // Failed jobs stay for inspection.
          removeOnFail: false,
        },
      );
      // A late rejection after the timeout must not become an unhandled rejection.
      added.catch(() => undefined);
      await withTimeout(
        added,
        ENQUEUE_TIMEOUT_MS,
        `Redis didn't answer within ${ENQUEUE_TIMEOUT_MS} ms`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue ${DESCRIBE_CONDITION_PHOTO_JOB} for condition photo ${photoId}: ${(error as Error).message}`,
      );
    }
  }
}
