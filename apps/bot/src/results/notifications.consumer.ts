import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { BATCH_PARSED_JOB, BOT_NOTIFICATIONS_QUEUE, type BatchParsedJobData } from '@rental/shared';
import { type Job, UnrecoverableError } from 'bullmq';
import { ResultsSender } from './results.sender.js';

// The bot's second input: API → bot events (queue `bot-notifications`, contract in @rental/shared). The event type
// is the job name. A signal only — the sender loads fresh data from the API. Retries: set by the API (5 attempts).
@Processor(BOT_NOTIFICATIONS_QUEUE)
export class NotificationsConsumer extends WorkerHost {
  private readonly logger = new Logger(NotificationsConsumer.name);

  constructor(private readonly sender: ResultsSender) {
    super();
  }

  async process(job: Job<BatchParsedJobData>): Promise<void> {
    switch (job.name) {
      case BATCH_PARSED_JOB:
        return this.sender.send(job.data.batchId, job.data.replyTo);
      default:
        throw new UnrecoverableError(`Unknown job ${job.name}`);
    }
  }

  // BullMQ records the failure in Redis only; log it too (ids and the message — grammY keeps the token out of it).
  @OnWorkerEvent('failed')
  onFailed(job: Job<BatchParsedJobData> | undefined, error: Error): void {
    this.logger.error(
      `${job?.name ?? 'job'} ${job?.id ?? '?'} failed (attempt ${job?.attemptsMade ?? '?'}): ${error.name}: ${error.message}`,
    );
  }
}
