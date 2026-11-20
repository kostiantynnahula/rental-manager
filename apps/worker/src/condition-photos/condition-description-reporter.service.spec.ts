import { status } from '@rental/testing';
import { conditionPhotoServices } from '../test/condition-photo-services.js';

const noContent = () => new Response(null, { status: 204 });

const DESCRIPTION = 'PUT /condition-photos/photo-1/description';

describe('ConditionDescriptionReporter.reportFailure', () => {
  it('sends the error', async () => {
    const { reporter, requests } = conditionPhotoServices({
      routes: { [DESCRIPTION]: noContent() },
    });
    await reporter.reportFailure('photo-1', 'HTTP 503');
    expect(requests.map((r) => r.body)).toEqual([{ error: 'HTTP 503' }]);
  });

  it('truncates the error to 1000 characters', async () => {
    const { reporter, requests } = conditionPhotoServices({
      routes: { [DESCRIPTION]: noContent() },
    });
    await reporter.reportFailure('photo-1', 'x'.repeat(1500));
    const { error } = requests[0].body as { error: string };
    expect(error).toHaveLength(1000);
    expect(error.endsWith('…')).toBe(true);
  });

  it('sends a fixed text for an empty error (the API rejects an empty one)', async () => {
    const { reporter, requests } = conditionPhotoServices({
      routes: { [DESCRIPTION]: noContent() },
    });
    await reporter.reportFailure('photo-1', '  ');
    expect(requests.map((r) => r.body)).toEqual([{ error: 'Unknown error' }]);
  });

  it('logs a refusal with the scope hint instead of throwing', async () => {
    const { reporter, logs } = conditionPhotoServices({ routes: { [DESCRIPTION]: status(403) } });
    await expect(reporter.reportFailure('photo-1', 'boom')).resolves.toBeUndefined();
    expect(logs.warn).toHaveBeenCalledWith(
      expect.stringContaining('the key needs the condition-photos:describe scope'),
    );
  });

  it('logs a network error instead of throwing', async () => {
    const { reporter, logs } = conditionPhotoServices({
      routes: {
        [DESCRIPTION]: () => {
          throw new TypeError('fetch failed');
        },
      },
    });
    await expect(reporter.reportFailure('photo-1', 'boom')).resolves.toBeUndefined();
    expect(logs.warn).toHaveBeenCalledWith(expect.stringContaining('fetch failed'));
  });
});
