import { UnrecoverableError } from 'bullmq';
import { ExtractionNotConfiguredError } from '../extraction/errors/extraction-not-configured.error.js';
import type { Extraction } from '../extraction/interfaces/extraction.interface.js';
import { extracted, meter, photo } from '../test/builders.js';
import { json, status, type RecordedRequest, type Routes } from '../test/fake-api.js';
import { photoServices } from '../test/photo-services.js';

const PHOTO = 'GET /photos/photo-1';
const METERS = 'GET /apartments/apt-1/meters';
const FILE = 'GET /photos/photo-1/file';
const RESULT = 'PUT /photos/photo-1/parse-result';
const draftValues = (meterId: string) => `POST /meters/${meterId}/draft-values`;

const file = () => new Response(new Uint8Array([1, 2, 3]));
const reported = (requests: RecordedRequest[]) =>
  requests.filter((r) => `${r.method} ${r.url}` === RESULT).map((r) => r.body);
const posted = (requests: RecordedRequest[]) => requests.filter((r) => r.method === 'POST');

// An apartment photo with one SINGLE electricity meter m1 and one reading for it.
function single(draftValuesResponse: Routes[string], extraction?: Extraction) {
  return photoServices({
    routes: {
      [PHOTO]: json(photo()),
      [METERS]: json([meter({ id: 'm1' })]),
      [FILE]: file(),
      [draftValues('m1')]: draftValuesResponse,
      [RESULT]: json({}),
    },
    extraction: extraction ?? { readings: [extracted({ value: '1520' })], photoIssues: [] },
  });
}

describe('ParsePhotoService.run', () => {
  it('fails without retry when the photo was deleted (404)', async () => {
    const { service, requests } = photoServices({ routes: { [PHOTO]: status(404) } });
    await expect(service.run('photo-1')).rejects.toBeInstanceOf(UnrecoverableError);
    expect(requests.map((r) => r.url)).toEqual(['/photos/photo-1']);
  });

  it('reports NOT_MATCHED without downloading or extracting when there are no meters', async () => {
    const { service, requests, extract } = photoServices({
      routes: { [PHOTO]: json(photo()), [METERS]: json([]), [RESULT]: json({}) },
    });
    await service.run('photo-1');
    expect(requests.some((r) => r.url === '/photos/photo-1/file')).toBe(false);
    expect(extract).not.toHaveBeenCalled();
    expect(reported(requests)).toEqual([{ status: 'NOT_MATCHED', note: 'no installed meters' }]);
  });

  it('posts one draft value per matched zone and reports PARSED (201 and 200 both count)', async () => {
    const { service, requests, extract } = photoServices({
      routes: {
        [PHOTO]: json(photo()),
        [METERS]: json([meter({ id: 'm1', zoneScheme: 'DAY_NIGHT' })]),
        [FILE]: file(),
        [draftValues('m1')]: (req) =>
          (req.body as { zone: string }).zone === 'DAY'
            ? json({ id: 'r1' }, 201)
            : json({ id: 'r1' }, 200),
        [RESULT]: json({}),
      },
      extraction: {
        readings: [
          extracted({ zone: 'DAY', value: '1520.5' }),
          extracted({ zone: 'NIGHT', value: '830', confidence: 'low', issues: ['glare'] }),
        ],
        photoIssues: [],
      },
    });

    await service.run('photo-1');

    expect(extract).toHaveBeenCalledWith(
      expect.objectContaining({ image: Buffer.from([1, 2, 3]), inbox: false }),
    );
    // createdAt 2026-10-31T22:30Z = 2026-11-01 in Kyiv.
    expect(posted(requests).map((r) => r.body)).toEqual([
      {
        period: '2026-11',
        readingDate: '2026-11-01',
        zone: 'DAY',
        value: '1520.5',
        photoId: 'photo-1',
      },
      {
        period: '2026-11',
        readingDate: '2026-11-01',
        zone: 'NIGHT',
        value: '830',
        photoId: 'photo-1',
        note: 'Фото NIGHT: впевненість low: glare',
      },
    ]);
    expect(reported(requests)).toEqual([{ status: 'PARSED' }]);
  });

  it('reports NOT_MATCHED with the reason on a 409 (zone already filled)', async () => {
    const { service, requests } = single(
      status(409, { message: 'Zone already filled', readingId: 'r9' }),
    );
    await service.run('photo-1');
    const [result] = reported(requests) as { status: string; note: string }[];
    expect(result.status).toBe('NOT_MATCHED');
    expect(result.note).toContain('not posted, 409 Zone already filled (draft r9)');
  });

  it('reports NOT_MATCHED with the reason on a 400', async () => {
    const { service, requests } = single(status(400, { message: 'value must be a decimal' }));
    await service.run('photo-1');
    const [result] = reported(requests) as { status: string; note: string }[];
    expect(result.status).toBe('NOT_MATCHED');
    expect(result.note).toContain('not posted, 400 value must be a decimal');
  });

  it('throws a plain Error (retried) on a 500 and reports nothing', async () => {
    const { service, requests } = single(status(500));
    const error = await service.run('photo-1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(UnrecoverableError);
    expect(reported(requests)).toEqual([]);
  });

  it('inbox: matches across all active meters; meters of two apartments → nothing posted', async () => {
    const { service, requests, extract } = photoServices({
      routes: {
        [PHOTO]: json(photo({ apartmentId: null })),
        'GET /meters?active=true': json([
          meter({ id: 'm1', apartmentId: 'apt-1', serialNumber: '11111111' }),
          meter({ id: 'm2', apartmentId: 'apt-2', serialNumber: '22222222', utility: 'GAS' }),
        ]),
        [FILE]: file(),
        [RESULT]: json({}),
      },
      extraction: {
        readings: [
          extracted({ serialNumber: '11111111' }),
          extracted({ serialNumber: '22222222', utility: 'GAS' }),
        ],
        photoIssues: [],
      },
    });

    await service.run('photo-1');

    expect(extract).toHaveBeenCalledWith(expect.objectContaining({ inbox: true }));
    expect(posted(requests)).toEqual([]);
    const [result] = reported(requests) as { status: string; note: string }[];
    expect(result.status).toBe('NOT_MATCHED');
    expect(result.note.split('\n')[0]).toBe('Лічильники різних квартир на одному фото');
  });

  it('fails without retry when extraction is not configured', async () => {
    const { service } = photoServices({
      routes: { [PHOTO]: json(photo()), [METERS]: json([meter()]), [FILE]: file() },
      extraction: new ExtractionNotConfiguredError('ANTHROPIC_API_KEY is not set'),
    });
    await expect(service.run('photo-1')).rejects.toBeInstanceOf(UnrecoverableError);
  });
});
