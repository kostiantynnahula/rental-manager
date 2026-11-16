import { PARSE_PHOTO_JOB, type ParsePhotoJobData } from '@rental/shared';
import { type Job, UnrecoverableError } from 'bullmq';
import { json } from '../test/fake-api.js';
import { photoServices } from '../test/photo-services.js';

const RESULT = 'PUT /photos/photo-1/parse-result';

// Only the fields the processor reads.
function job({ name = PARSE_PHOTO_JOB, attemptsMade = 1, attempts = 3 } = {}) {
  return {
    id: 'photo-1',
    name,
    data: { photoId: 'photo-1' },
    attemptsMade,
    opts: { attempts },
  } as unknown as Job<ParsePhotoJobData>;
}

describe('ParsePhotoProcessor', () => {
  it('fails an unknown job without retry and without running the service', async () => {
    const { processor, service } = photoServices();
    const run = vi.spyOn(service, 'run');
    await expect(processor.process(job({ name: 'resize-photo' }))).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    expect(run).not.toHaveBeenCalled();
  });

  it('runs the service for a parse-photo job', async () => {
    const { processor, service } = photoServices();
    const run = vi.spyOn(service, 'run').mockResolvedValue();
    await processor.process(job());
    expect(run).toHaveBeenCalledWith('photo-1');
  });

  describe('onFailed', () => {
    it('reports FAILED on an UnrecoverableError, even on the first attempt', async () => {
      const { processor, requests } = photoServices({ routes: { [RESULT]: json({}) } });
      await processor.onFailed(job({ attemptsMade: 1 }), new UnrecoverableError('Photo deleted'));
      expect(requests.map((r) => r.body)).toEqual([{ status: 'FAILED', note: 'Photo deleted' }]);
    });

    it('reports nothing while retries are left', async () => {
      const { processor, requests } = photoServices();
      await processor.onFailed(job({ attemptsMade: 1, attempts: 3 }), new Error('HTTP 500'));
      expect(requests).toEqual([]);
    });

    it('reports FAILED after the last attempt', async () => {
      const { processor, requests } = photoServices({ routes: { [RESULT]: json({}) } });
      await processor.onFailed(job({ attemptsMade: 3, attempts: 3 }), new Error('HTTP 500'));
      expect(requests.map((r) => r.body)).toEqual([{ status: 'FAILED', note: 'HTTP 500' }]);
    });
  });
});
