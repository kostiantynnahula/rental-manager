import { json, status } from '../test/fake-api.js';
import { photoServices } from '../test/photo-services.js';

const RESULT = 'PUT /photos/photo-1/parse-result';

describe('ParseResultReporter.report', () => {
  it('sends the status and note', async () => {
    const { reporter, requests } = photoServices({ routes: { [RESULT]: json({}) } });
    await reporter.report('photo-1', 'NOT_MATCHED', 'no readings');
    expect(requests.map((r) => r.body)).toEqual([{ status: 'NOT_MATCHED', note: 'no readings' }]);
  });

  it('truncates the note to 1000 characters', async () => {
    const { reporter, requests } = photoServices({ routes: { [RESULT]: json({}) } });
    await reporter.report('photo-1', 'FAILED', 'x'.repeat(1500));
    const { note } = requests[0].body as { note: string };
    expect(note).toHaveLength(1000);
    expect(note.endsWith('…')).toBe(true);
  });

  it('logs a non-ok response instead of throwing', async () => {
    const { reporter, logs } = photoServices({ routes: { [RESULT]: status(403) } });
    await expect(reporter.report('photo-1', 'PARSED')).resolves.toBeUndefined();
    expect(logs.warn).toHaveBeenCalledWith(
      expect.stringContaining('the key needs the photos:parse-result scope'),
    );
  });

  it('logs a network error instead of throwing', async () => {
    const { reporter, logs } = photoServices({
      routes: {
        [RESULT]: () => {
          throw new TypeError('fetch failed');
        },
      },
    });
    await expect(reporter.report('photo-1', 'PARSED')).resolves.toBeUndefined();
    expect(logs.warn).toHaveBeenCalledWith(expect.stringContaining('fetch failed'));
  });
});
