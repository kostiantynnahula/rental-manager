import { fakeTelegram, TEST_TOKEN } from '../../test/fake-telegram.js';
import { downloadTelegramFile } from './download-telegram-file.js';

const BYTES = new Uint8Array([7, 8, 9]);
const PATH = 'photos/file-1.jpg';

describe('downloadTelegramFile', () => {
  it('fetches the file from the default Bot API root and returns its bytes', async () => {
    const tg = fakeTelegram({ files: { [PATH]: BYTES } });
    const bytes = await downloadTelegramFile(tg.api, 'file-1');
    expect(tg.calls).toEqual([{ method: 'getFile', payload: { file_id: 'file-1' } }]);
    expect(tg.downloads).toEqual([`https://api.telegram.org/file/bot${TEST_TOKEN}/${PATH}`]);
    expect([...bytes]).toEqual([7, 8, 9]);
  });

  it('uses the client apiRoot and the test environment', async () => {
    const tg = fakeTelegram({
      files: { [PATH]: BYTES },
      client: { apiRoot: 'http://bot-api.local:8081', environment: 'test' },
    });
    await downloadTelegramFile(tg.api, 'file-1');
    expect(tg.downloads).toEqual([`http://bot-api.local:8081/file/bot${TEST_TOKEN}/test/${PATH}`]);
  });

  it('fails when Telegram gives no file_path', async () => {
    const tg = fakeTelegram({
      routes: { getFile: (p) => ({ file_id: p.file_id, file_unique_id: 'u' }) },
    });
    await expect(downloadTelegramFile(tg.api, 'file-1')).rejects.toThrow(
      'Telegram file download failed (no file_path)',
    );
    expect(tg.downloads).toEqual([]);
  });

  // The download URL carries the token: whatever fails, the error must not leak it.
  async function failure(file: Response | Error): Promise<Error> {
    const tg = fakeTelegram({ files: { [PATH]: file } });
    const error = await downloadTelegramFile(tg.api, 'file-1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    return error as Error;
  }

  it('hides the URL and the token on a network error', async () => {
    const url = `https://api.telegram.org/file/bot${TEST_TOKEN}/${PATH}`;
    const error = await failure(new TypeError(`fetch failed: ${url}`));
    expect(error.message).toBe('Telegram file download failed (network error)');
    expect(error.cause).toBeUndefined();
    expect(error.stack).not.toContain(TEST_TOKEN);
  });

  it('hides the URL and the token on an HTTP error', async () => {
    const error = await failure(new Response('Not Found', { status: 404 }));
    expect(error.message).toBe('Telegram file download failed (HTTP 404)');
    expect(error.message).not.toContain(TEST_TOKEN);
    expect(error.cause).toBeUndefined();
  });
});
