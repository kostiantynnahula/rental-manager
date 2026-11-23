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
      // BullMQ ignores a job whose id already exists: one upload job per photo.
      await this.add(photoId, photoId);
    } catch (error) {
      this.logger.error(
        `Failed to enqueue ${DESCRIBE_CONDITION_PHOTO_JOB} for condition photo ${photoId}: ${(error as Error).message}`,
      );
    }
  }

  // Describe an already uploaded photo again (the describe:requeue CLI, e.g. after a prompt change). The upload job
  // keeps jobId = photoId for 7 days (failed: forever) and BullMQ would silently ignore the same id, so it gets its
  // own (no ":" — BullMQ forbids it). Throws: the caller must know what wasn't queued.
  async enqueueRedescribe(photoId: string): Promise<void> {
    await this.add(photoId, `${photoId}-${Date.now()}`);
  }

  private async add(photoId: string, jobId: string): Promise<void> {
    const added = this.queue.add(
      DESCRIBE_CONDITION_PHOTO_JOB,
      { photoId },
      {
        jobId,
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
  }
}
