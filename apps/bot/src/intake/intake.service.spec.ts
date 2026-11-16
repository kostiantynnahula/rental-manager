import { json, status, type RecordedRequest, type Routes } from '@rental/testing';
import { MESSAGES } from '../messages.js';
import {
  CHAT_ID,
  contextFor,
  documentMessage,
  photoMessage,
  telegramError,
} from '../test/fake-telegram.js';
import { intakeService, type IntakeServiceOptions } from '../test/intake-service.js';
import type { Message } from 'grammy/types';

const UPLOAD = 'POST /photos';
const SILENCE_MS = 1500;
const MB = 1024 * 1024;

// The API's answer to POST /photos: one record per new file (duplicate: already stored before).
const stored = (...duplicates: boolean[]) =>
  json(
    duplicates.map((duplicate, i) => ({ id: `photo-${i}`, duplicate })),
    201,
  );

// The uploaded multipart body: file names in order, and replyTo.
function upload(req: RecordedRequest) {
  const form = req.body as FormData;
  return {
    files: form.getAll('files').map((f) => (f as File).name),
    replyTo: form.get('replyTo'),
  };
}

function setup(options: IntakeServiceOptions = {}) {
  const s = intakeService(options);
  const send = async (...messages: Message[]) => {
    for (const m of messages) await s.intake.add(contextFor(s.telegram.bot, m));
  };
  // After the silence the buffer has handed the batch over on its own (no timer left); flush() then only waits for
  // the in-flight upload.
  const settle = async () => {
    await vi.advanceTimersByTimeAsync(SILENCE_MS);
    expect(vi.getTimerCount(), 'the batch is still buffered after the silence').toBe(0);
    await s.intake.flush();
  };
  const uploads = () => s.requests.filter((r) => `${r.method} ${r.url}` === UPLOAD).map(upload);
  const replies = () => s.telegram.calls.filter((c) => c.method === 'sendMessage');
  return { ...s, send, settle, uploads, replies };
}

const album = (from: number, count: number, groupId = 'album-1') =>
  Array.from({ length: count }, (_, i) => photoMessage(from + i, { media_group_id: groupId }));

describe('IntakeService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('batching', () => {
    it('uploads an album once after the silence and replies once to its first photo', async () => {
      const s = setup({ routes: { [UPLOAD]: stored(false, false, false) } });
      await s.send(...album(10, 3));

      await vi.advanceTimersByTimeAsync(SILENCE_MS - 1);
      expect(s.requests).toEqual([]);

      await s.settle();
      expect(s.uploads()).toEqual([
        {
          files: ['photo-photo-10.jpg', 'photo-photo-11.jpg', 'photo-photo-12.jpg'],
          replyTo: `${CHAT_ID}:10`,
        },
      ]);
      expect(s.replies().map((c) => c.payload)).toEqual([
        expect.objectContaining({
          chat_id: CHAT_ID,
          text: 'Прийнято 3 фото, розпізнаю…',
          reply_parameters: { message_id: 10, allow_sending_without_reply: true },
        }),
      ]);
    });

    it('collects photos sent in a row (no album) into one batch', async () => {
      const s = setup({ routes: { [UPLOAD]: stored(false, false) } });
      await s.send(photoMessage(20));
      await vi.advanceTimersByTimeAsync(SILENCE_MS / 2);
      await s.send(photoMessage(21));
      await s.settle();
      expect(s.uploads()).toEqual([
        { files: ['photo-photo-20.jpg', 'photo-photo-21.jpg'], replyTo: `${CHAT_ID}:20` },
      ]);
      expect(s.replies()).toHaveLength(1);
    });

    it('uploads 10 photos at once, without waiting for the silence', async () => {
      const s = setup({ routes: { [UPLOAD]: stored(...Array<boolean>(10).fill(false)) } });
      await s.send(...album(30, 10));
      expect(vi.getTimerCount()).toBe(0);
      await s.intake.flush();
      expect(s.uploads()[0].files).toHaveLength(10);
      expect(s.replies()[0].payload.text).toBe('Прийнято 10 фото, розпізнаю…');
    });

    it('flush() uploads what is buffered, without waiting for the silence', async () => {
      const s = setup({ routes: { [UPLOAD]: stored(false) } });
      await s.send(photoMessage(40));
      await s.intake.flush();
      expect(s.uploads()).toHaveLength(1);
      expect(s.replies()).toHaveLength(1);
    });

    it('answers a file that is not an image at once, without uploading', async () => {
      const s = setup();
      await s.send(documentMessage(50, { name: 'bill.pdf', mime: 'application/pdf' }));
      await s.settle();
      expect(s.requests).toEqual([]);
      expect(s.replies().map((c) => c.payload)).toEqual([
        expect.objectContaining({ chat_id: CHAT_ID, text: MESSAGES.notAnImage }),
      ]);
    });

    it('uploads an image sent as a file under its own name', async () => {
      const s = setup({ routes: { [UPLOAD]: stored(false) } });
      await s.send(documentMessage(55, { name: 'meter.png', mime: 'image/png' }));
      await s.settle();
      expect(s.uploads()[0].files).toEqual(['meter.png']);
    });
  });

  describe('the API answer', () => {
    it('counts duplicates', async () => {
      const s = setup({ routes: { [UPLOAD]: stored(false, true) } });
      await s.send(...album(60, 2));
      await s.settle();
      expect(s.replies()[0].payload.text).toBe(
        'Прийнято 1 фото, розпізнаю…\n1 фото вже отримано раніше.',
      );
    });

    it('drops a file the API rejects (400 files[i]) and sends the rest again', async () => {
      let call = 0;
      const routes: Routes = {
        [UPLOAD]: () =>
          ++call === 1
            ? status(400, { message: 'files[1]: unsupported type image/gif' })
            : stored(false, false),
      };
      const s = setup({ routes });
      await s.send(...album(70, 3));
      await s.settle();
      expect(s.uploads().map((u) => u.files)).toEqual([
        ['photo-photo-70.jpg', 'photo-photo-71.jpg', 'photo-photo-72.jpg'],
        ['photo-photo-70.jpg', 'photo-photo-72.jpg'],
      ]);
      expect(s.replies()[0].payload.text).toBe(
        'Прийнято 2 фото, розпізнаю…\n' +
          'фото 2: формат не підтримується або файл пошкоджений (лише JPEG, PNG, WebP)',
      );
    });

    it('answers every file «too large» on 413', async () => {
      const s = setup({ routes: { [UPLOAD]: status(413) } });
      await s.send(...album(80, 2));
      await s.settle();
      expect(s.replies()[0].payload.text).toBe('фото 1: завелике\nфото 2: завелике');
    });

    it.each([401, 403])('answers «no access» on %i and logs it', async (code) => {
      const s = setup({ routes: { [UPLOAD]: status(code) } });
      await s.send(photoMessage(90));
      await s.settle();
      expect(s.replies()[0].payload.text).toBe(
        'фото 1: бот не має доступу до API (перевірте BOT_API_KEY)',
      );
      expect(s.logs.error).toHaveBeenCalledWith(expect.stringContaining(`HTTP ${code}`));
    });

    it.each([
      ['HTTP 500', () => status(500)],
      [
        'a network error',
        () => {
          throw new TypeError('fetch failed');
        },
      ],
    ])('answers «try again» on %s', async (_, route) => {
      const s = setup({ routes: { [UPLOAD]: route } });
      await s.send(photoMessage(95));
      await s.settle();
      expect(s.replies()[0].payload.text).toBe('фото 1: не вдалося завантажити, надішліть ще раз');
      expect(s.logs.error).toHaveBeenCalledWith(expect.stringContaining('Upload failed'));
    });
  });

  describe('size and download', () => {
    it('rejects a photo over the limit by its file_size, without downloading it', async () => {
      const s = setup({ routes: { [UPLOAD]: stored(false) }, maxFileSizeMb: 1 });
      await s.send(photoMessage(100, { fileSize: 2 * MB }), photoMessage(101));
      await s.settle();
      expect(s.telegram.calls.filter((c) => c.method === 'getFile').map((c) => c.payload)).toEqual([
        { file_id: 'photo-101' },
      ]);
      expect(s.uploads()[0].files).toEqual(['photo-photo-101.jpg']);
      expect(s.replies()[0].payload.text).toBe('Прийнято 1 фото, розпізнаю…\nфото 1: завелике');
    });

    it('rejects a file without file_size when the downloaded bytes are over the limit', async () => {
      const s = setup({
        maxFileSizeMb: 1,
        telegram: { files: { 'photos/big.jpg': new Uint8Array(MB + 1) } },
      });
      await s.send(documentMessage(110, { fileId: 'big', name: 'big.jpg' }));
      await s.settle();
      expect(s.requests).toEqual([]);
      expect(s.replies()[0].payload.text).toBe('big.jpg: завелике');
    });

    const downloadFailed =
      'Прийнято 1 фото, розпізнаю…\nфото 1: не вдалося отримати з Telegram, надішліть ще раз';

    it('rejects only the file whose getFile is refused', async () => {
      const s = setup({
        routes: { [UPLOAD]: stored(false) },
        telegram: {
          routes: {
            getFile: (p) =>
              p.file_id === 'bad'
                ? telegramError(400, 'Bad Request: file is too big')
                : { file_id: p.file_id, file_unique_id: 'ok', file_path: 'photos/ok.jpg' },
          },
        },
      });
      await s.send(photoMessage(120, { fileId: 'bad' }), photoMessage(121));
      await s.settle();
      expect(s.uploads()[0].files).toEqual(['photo-photo-121.jpg']);
      expect(s.replies()[0].payload.text).toBe(downloadFailed);
      expect(s.logs.error).toHaveBeenCalledWith(
        expect.stringContaining('Download of фото 1 failed'),
      );
    });

    it('rejects only the file whose download answers 404', async () => {
      const s = setup({
        routes: { [UPLOAD]: stored(false) },
        telegram: { files: { 'photos/bad.jpg': new Response('', { status: 404 }) } },
      });
      await s.send(photoMessage(125, { fileId: 'bad' }), photoMessage(126));
      await s.settle();
      expect(s.uploads()[0].files).toEqual(['photo-photo-126.jpg']);
      expect(s.replies()[0].payload.text).toBe(downloadFailed);
    });

    it('sends no request when no file could be downloaded, only the reply', async () => {
      const s = setup({
        telegram: { files: { 'photos/photo-130.jpg': new TypeError('fetch failed') } },
      });
      await s.send(photoMessage(130));
      await s.settle();
      expect(s.requests).toEqual([]);
      expect(s.replies()[0].payload.text).toBe(
        'фото 1: не вдалося отримати з Telegram, надішліть ще раз',
      );
    });
  });

  it('logs a failed reply without throwing', async () => {
    const s = setup({
      routes: { [UPLOAD]: stored(false) },
      telegram: {
        routes: { sendMessage: () => telegramError(403, 'Forbidden: bot was blocked by the user') },
      },
    });
    await s.send(photoMessage(140));
    await expect(s.settle()).resolves.toBeUndefined();
    expect(s.uploads()).toHaveLength(1);
    expect(s.logs.error).toHaveBeenCalledWith(
      expect.stringMatching(/^Reply to chat 777 failed: GrammyError: .*blocked by the user/),
    );
  });
});
