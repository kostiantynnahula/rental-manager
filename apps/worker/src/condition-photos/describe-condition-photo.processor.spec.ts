import { DESCRIBE_CONDITION_PHOTO_JOB, type DescribeConditionPhotoJobData } from '@rental/shared';
import { type Job, UnrecoverableError } from 'bullmq';
import { conditionPhotoServices } from '../test/condition-photo-services.js';

const noContent = () => new Response(null, { status: 204 });

const DESCRIPTION = 'PUT /condition-photos/photo-1/description';

// Only the fields the processor reads.
function job({ name = DESCRIBE_CONDITION_PHOTO_JOB, attemptsMade = 1, attempts = 5 } = {}) {
  return {
    id: 'photo-1',
    name,
    data: { photoId: 'photo-1' },
    attemptsMade,
    opts: { attempts },
  } as unknown as Job<DescribeConditionPhotoJobData>;
}

describe('DescribeConditionPhotoProcessor', () => {
  it('fails an unknown job without retry and without running the service', async () => {
    const { processor, service } = conditionPhotoServices();
    const run = vi.spyOn(service, 'run');
    await expect(processor.process(job({ name: 'parse-photo' }))).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    expect(run).not.toHaveBeenCalled();
  });

  it('runs the service for a describe-condition-photo job', async () => {
    const { processor, service } = conditionPhotoServices();
    const run = vi.spyOn(service, 'run').mockResolvedValue();
    await processor.process(job());
    expect(run).toHaveBeenCalledWith('photo-1');
  });

  describe('onFailed', () => {
    it('reports the error on an UnrecoverableError, even on the first attempt', async () => {
      const { processor, requests } = conditionPhotoServices({
        routes: { [DESCRIPTION]: noContent() },
      });
      await processor.onFailed(job(), new UnrecoverableError('Condition photo deleted'));
      expect(requests.map((r) => r.body)).toEqual([{ error: 'Condition photo deleted' }]);
    });

    it('reports nothing while retries are left', async () => {
      const { processor, requests } = conditionPhotoServices();
      await processor.onFailed(job({ attemptsMade: 2 }), new Error('HTTP 503'));
      expect(requests).toEqual([]);
    });

    it('reports the error after the last attempt', async () => {
      const { processor, requests } = conditionPhotoServices({
        routes: { [DESCRIPTION]: noContent() },
      });
      await processor.onFailed(job({ attemptsMade: 5 }), new Error('HTTP 503'));
      expect(requests.map((r) => r.body)).toEqual([{ error: 'HTTP 503' }]);
    });

    it('reports nothing for another job name', async () => {
      const { processor, requests } = conditionPhotoServices();
      await processor.onFailed(job({ name: 'parse-photo' }), new UnrecoverableError('Unknown job'));
      expect(requests).toEqual([]);
    });
  });
});
