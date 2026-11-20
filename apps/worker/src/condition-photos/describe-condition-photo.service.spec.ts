import { json, status } from '@rental/testing';
import { UnrecoverableError } from 'bullmq';
import { ExtractionNotConfiguredError } from '../extraction/errors/extraction-not-configured.error.js';
import { conditionDescription, conditionPhotoServices } from '../test/condition-photo-services.js';

const noContent = () => new Response(null, { status: 204 });

const FILE = 'GET /condition-photos/photo-1/file';
const DESCRIPTION = 'PUT /condition-photos/photo-1/description';
const file = () => new Response(new Uint8Array([1, 2, 3]));

describe('DescribeConditionPhotoService.run', () => {
  it('describes the file and saves the description', async () => {
    const { service, describe, requests } = conditionPhotoServices({
      routes: { [FILE]: file(), [DESCRIPTION]: noContent() },
    });
    await service.run('photo-1');
    expect(describe).toHaveBeenCalledWith(Buffer.from([1, 2, 3]));
    expect(requests.filter((r) => r.method === 'PUT').map((r) => r.body)).toEqual([
      { description: conditionDescription() },
    ]);
  });

  it('fails without retry when the photo was deleted, before any model call', async () => {
    const { service, describe } = conditionPhotoServices({ routes: { [FILE]: status(404) } });
    await expect(service.run('photo-1')).rejects.toBeInstanceOf(UnrecoverableError);
    expect(describe).not.toHaveBeenCalled();
  });

  it('fails without retry when the model is not configured', async () => {
    const { service } = conditionPhotoServices({
      routes: { [FILE]: file() },
      description: new ExtractionNotConfiguredError('ANTHROPIC_API_KEY is not set'),
    });
    await expect(service.run('photo-1')).rejects.toBeInstanceOf(UnrecoverableError);
  });

  it('retries a model error (a plain Error)', async () => {
    const { service } = conditionPhotoServices({
      routes: { [FILE]: file() },
      description: new Error('overloaded'),
    });
    const error = await service.run('photo-1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(UnrecoverableError);
  });

  it('retries a 5xx on the PUT: the description is the job output', async () => {
    const { service } = conditionPhotoServices({
      routes: { [FILE]: file(), [DESCRIPTION]: status(503) },
    });
    const error = await service.run('photo-1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(UnrecoverableError);
  });

  it.each([400, 404])('fails without retry on a %i from the PUT', async (code) => {
    const { service } = conditionPhotoServices({
      routes: { [FILE]: file(), [DESCRIPTION]: status(code, { message: 'nope' }) },
    });
    await expect(service.run('photo-1')).rejects.toThrow(
      expect.objectContaining({
        name: 'UnrecoverableError',
        message: expect.stringContaining('nope'),
      }),
    );
  });

  it('hints at the scope on a 403 from the PUT', async () => {
    const { service } = conditionPhotoServices({
      routes: { [FILE]: file(), [DESCRIPTION]: status(403) },
    });
    await expect(service.run('photo-1')).rejects.toThrow(/condition-photos:describe/);
  });

  it('logs the room and the item count, not the description text', async () => {
    const { service, logs } = conditionPhotoServices({
      routes: { [FILE]: file(), [DESCRIPTION]: json({}) },
    });
    await service.run('photo-1');
    const line = logs.log.mock.calls.map(([msg]) => String(msg)).join('\n');
    expect(line).toContain('KITCHEN, 1 items');
    expect(line).not.toContain('холодильник');
  });
});
