import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { BATCH_PARSED_JOB, BOT_NOTIFICATIONS_QUEUE, type BatchParsedJobData } from '@rental/shared';
import { Queue } from 'bullmq';
import { withTimeout } from './helpers/with-timeout.js';

const DAY_SECONDS = 24 * 60 * 60;

// As in PhotoJobsService: BullMQ waits for Redis without a limit, so the caller's request would hang.
const ENQUEUE_TIMEOUT_MS = 3_000;

// api → bot events (the bot consumes them; names and payloads: @rental/shared). A signal only.
@Injectable()
export class BotNotificationsService {
  private readonly logger = new Logger(BotNotificationsService.name);

  constructor(
    @InjectQueue(BOT_NOTIFICATIONS_QUEUE) private readonly queue: Queue<BatchParsedJobData>,
  ) {}

  // Never throws: a queue outage must not fail the worker's parse-result request (logged; the batch then gets
  // no event).
  async notifyBatchParsed(batchId: string, replyTo: string): Promise<void> {
    try {
      const added = this.queue.add(
        BATCH_PARSED_JOB,
        { batchId, replyTo },
        {
          // BullMQ ignores a job whose id already exists: one event per batch while it is queued. No ":" in the
          // id — BullMQ forbids it.
          jobId: `${BATCH_PARSED_JOB}-${batchId}`,
          attempts: 5,
          backoff: { type: 'exponential', delay: 10_000 },
          // Frees the id, so a later re-parse of a photo of the batch can notify again.
          removeOnComplete: true,
          // Kept for inspection; frees the id after a week.
          removeOnFail: { age: 7 * DAY_SECONDS },
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
        `Failed to enqueue ${BATCH_PARSED_JOB} for batch ${batchId}: ${(error as Error).message}`,
      );
    }
  }
}
