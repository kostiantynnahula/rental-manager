import { json, status } from '@rental/testing';
import { GrammyError } from 'grammy';
import { botServices, type BotServicesOptions } from '../test/bot-services.js';
import { apartment, BATCH_ID, batch, batchPhoto, PHOTO_ID, uuid } from '../test/builders.js';
import { CHAT_ID, telegramError } from '../test/fake-telegram.js';
import { renderSummary } from './render/summary.js';

const BATCH = `GET /photo-batches/${BATCH_ID}`;
const APARTMENTS = 'GET /apartments?active=true';
const REPLY_TO = `${CHAT_ID}:42`;

function setup(options: BotServicesOptions = {}) {
  const s = botServices(options);
  const telegramCalls = (method: string) => s.telegram.calls.filter((c) => c.method === method);
  return { ...s, telegramCalls };
}

// A batch with one photo no meter was found for: the summary needs the apartments.
const notMatched = batch({
  photos: [batchPhoto({ parseStatus: 'NOT_MATCHED', parseNote: null })],
  apartments: [],
});

describe('ResultsSender.send', () => {
  it('replies to the first photo with the summary and its buttons', async () => {
    const s = setup({ routes: { [BATCH]: json(batch()) } });
    await s.sender.send(BATCH_ID, REPLY_TO);

    const summary = renderSummary(batch(), []);
    expect(s.requests.map((r) => `${r.method} ${r.url}`)).toEqual([BATCH]);
    expect(s.telegramCalls('sendMessage').map((c) => c.payload)).toEqual([
      expect.objectContaining({
        chat_id: CHAT_ID,
        text: summary.text,
        reply_parameters: { message_id: 42, allow_sending_without_reply: true },
        reply_markup: {
          inline_keyboard: summary.buttons.map((row) =>
            row.map((b) => ({ text: b.text, callback_data: b.data })),
          ),
        },
      }),
    ]);
  });

  it('sends no keyboard when there are no buttons', async () => {
    const s = setup({ routes: { [BATCH]: json(batch({ apartments: [] })) } });
    await s.sender.send(BATCH_ID, REPLY_TO);
    expect(s.telegramCalls('sendMessage')[0].payload.reply_markup).toBeUndefined();
  });

  it('loads the active apartments only for a NOT_MATCHED photo, for its buttons', async () => {
    const apartments = [apartment({ id: uuid(30), name: 'A' })];
    const s = setup({ routes: { [BATCH]: json(notMatched), [APARTMENTS]: json(apartments) } });
    await s.sender.send(BATCH_ID, REPLY_TO);
    expect(s.requests.map((r) => `${r.method} ${r.url}`)).toEqual([BATCH, APARTMENTS]);
    const markup = s.telegramCalls('sendMessage')[0].payload.reply_markup as {
      inline_keyboard: { text: string }[][];
    };
    expect(markup.inline_keyboard).toEqual([[expect.objectContaining({ text: 'фото 1 → A' })]]);
  });

  it('throws when the apartments cannot be loaded (BullMQ retries)', async () => {
    const s = setup({ routes: { [BATCH]: json(notMatched), [APARTMENTS]: status(500) } });
    await expect(s.sender.send(BATCH_ID, REPLY_TO)).rejects.toThrow(
      'GET /apartments failed: HTTP 500',
    );
    expect(s.telegramCalls('sendMessage')).toEqual([]);
  });

  it.each(['', 'abc', '777', '777:x'])(
    'drops a malformed replyTo %j: logged, no API or Telegram call',
    async (replyTo) => {
      const s = setup();
      await expect(s.sender.send(BATCH_ID, replyTo)).resolves.toBeUndefined();
      expect(s.requests).toEqual([]);
      expect(s.telegram.calls).toEqual([]);
      expect(s.logs.warn).toHaveBeenCalledWith(expect.stringContaining('dropped'));
    },
  );

  it('sends nothing and does not throw when the batch is gone (404)', async () => {
    const s = setup({ routes: { [BATCH]: status(404) } });
    await expect(s.sender.send(BATCH_ID, REPLY_TO)).resolves.toBeUndefined();
    expect(s.telegram.calls).toEqual([]);
    expect(s.logs.warn).toHaveBeenCalledWith(`Batch ${BATCH_ID} not found`);
  });

  it.each([401, 500, 503])('throws on HTTP %i (BullMQ retries)', async (code) => {
    const s = setup({ routes: { [BATCH]: status(code) } });
    await expect(s.sender.send(BATCH_ID, REPLY_TO)).rejects.toThrow(`HTTP ${code}`);
    expect(s.telegram.calls).toEqual([]);
  });

  it('throws a Telegram error (BullMQ retries)', async () => {
    const s = setup({
      routes: { [BATCH]: json(batch()) },
      telegram: { routes: { sendMessage: () => telegramError(429, 'Too Many Requests') } },
    });
    await expect(s.sender.send(BATCH_ID, REPLY_TO)).rejects.toBeInstanceOf(GrammyError);
  });
});

describe('ResultsSender.refresh', () => {
  it('edits the tapped message with the summary re-rendered from the API', async () => {
    const s = setup({ routes: { [BATCH]: json(batch()) } });
    await s.sender.refresh(CHAT_ID, 500, BATCH_ID);
    const summary = renderSummary(batch(), []);
    expect(s.telegramCalls('editMessageText').map((c) => c.payload)).toEqual([
      {
        chat_id: CHAT_ID,
        message_id: 500,
        text: summary.text,
        reply_markup: expect.objectContaining({ inline_keyboard: expect.any(Array) }),
      },
    ]);
  });

  it('removes the buttons with an empty keyboard once nothing is left to do', async () => {
    const done = batch({ apartments: [], photos: [batchPhoto({ id: PHOTO_ID })] });
    const s = setup({ routes: { [BATCH]: json(done) } });
    await s.sender.refresh(CHAT_ID, 500, BATCH_ID);
    expect(s.telegramCalls('editMessageText')[0].payload.reply_markup).toEqual({
      inline_keyboard: [],
    });
  });

  it('ignores «message is not modified»', async () => {
    const s = setup({
      routes: { [BATCH]: json(batch()) },
      telegram: {
        routes: {
          editMessageText: () =>
            telegramError(
              400,
              'Bad Request: message is not modified: specified new message content and reply markup are exactly the same',
            ),
        },
      },
    });
    await expect(s.sender.refresh(CHAT_ID, 500, BATCH_ID)).resolves.toBeUndefined();
  });

  it('throws any other Telegram error', async () => {
    const s = setup({
      routes: { [BATCH]: json(batch()) },
      telegram: {
        routes: {
          editMessageText: () => telegramError(400, "Bad Request: message can't be edited"),
        },
      },
    });
    await expect(s.sender.refresh(CHAT_ID, 500, BATCH_ID)).rejects.toThrow(
      "message can't be edited",
    );
  });

  it('edits nothing when the batch is gone (404)', async () => {
    const s = setup({ routes: { [BATCH]: status(404) } });
    await expect(s.sender.refresh(CHAT_ID, 500, BATCH_ID)).resolves.toBeUndefined();
    expect(s.telegram.calls).toEqual([]);
  });
});
