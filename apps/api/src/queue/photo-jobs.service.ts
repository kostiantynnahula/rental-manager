import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PARSE_PHOTO_JOB, PHOTO_QUEUE, type ParsePhotoJobData } from '@rental/shared';
import { Queue } from 'bullmq';
import { withTimeout } from './helpers/with-timeout.js';

const DAY_SECONDS = 24 * 60 * 60;

// BullMQ waits for the Redis connection before every command, with no limit: while Redis is down, add()
// would hang the upload request. After this the upload goes on; the pending add() still completes if Redis
// comes back (same jobId, so no duplicate).
const ENQUEUE_TIMEOUT_MS = 3_000;

@Injectable()
export class PhotoJobsService {
  private readonly logger = new Logger(PhotoJobsService.name);

  constructor(@InjectQueue(PHOTO_QUEUE) private readonly queue: Queue<ParsePhotoJobData>) {}

  // Never throws: a queue outage must not fail the upload (the photo can still be read by hand).
  // reparse: the photo was parsed before (e.g. an apartment was assigned) — its upload job keeps jobId = photoId for
  // 7 days and BullMQ would silently ignore the same id, so a re-parse gets its own (no ":" — BullMQ forbids it).
  async enqueueParse(
    photoId: string,
    { reparse = false }: { reparse?: boolean } = {},
  ): Promise<void> {
    try {
      const added = this.queue.add(
        PARSE_PHOTO_JOB,
        { photoId },
        {
          // BullMQ ignores a job whose id already exists: one upload job per photo.
          jobId: reparse ? `${photoId}-${Date.now()}` : photoId,
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
        `Failed to enqueue ${PARSE_PHOTO_JOB} for photo ${photoId}: ${(error as Error).message}`,
      );
    }
  }
}
