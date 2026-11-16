import { BATCH_PARSED_JOB, type BatchParsedJobData } from '@rental/shared';
import { type Job, UnrecoverableError } from 'bullmq';
import { botServices } from '../test/bot-services.js';

const job = (name: string, data: BatchParsedJobData) => ({ name, data }) as Job<BatchParsedJobData>;
const DATA: BatchParsedJobData = { batchId: 'batch-1', replyTo: '777:42' };

describe('NotificationsConsumer', () => {
  it('sends the summary on batch-parsed', async () => {
    const { consumer, sender } = botServices();
    const send = vi.spyOn(sender, 'send').mockResolvedValue();
    await consumer.process(job(BATCH_PARSED_JOB, DATA));
    expect(send).toHaveBeenCalledExactlyOnceWith('batch-1', '777:42');
  });

  it('lets a failed send throw, so BullMQ retries', async () => {
    const { consumer, sender } = botServices();
    vi.spyOn(sender, 'send').mockRejectedValue(
      new Error('GET /photo-batches/batch-1 failed: HTTP 500'),
    );
    await expect(consumer.process(job(BATCH_PARSED_JOB, DATA))).rejects.toThrow('HTTP 500');
  });

  it('rejects an unknown job as unrecoverable (no retry)', async () => {
    const { consumer, sender } = botServices();
    const send = vi.spyOn(sender, 'send');
    await expect(consumer.process(job('batch-exploded', DATA))).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    expect(send).not.toHaveBeenCalled();
  });
});
