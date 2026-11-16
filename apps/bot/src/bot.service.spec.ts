import { json } from '@rental/testing';
import type { Update } from 'grammy/types';
import { MESSAGES } from './messages.js';
import { encodeAction } from './results/render/callback-data.js';
import { botServices, type BotServicesOptions } from './test/bot-services.js';
import { BATCH_ID, batch, READING_ID } from './test/builders.js';
import {
  callbackUpdate,
  CHAT_ID,
  documentMessage,
  messageUpdate,
  photoMessage,
  telegramError,
} from './test/fake-telegram.js';

const STRANGER = { id: 999, is_bot: false, first_name: 'Stranger' };
const SILENCE_MS = 1500;
const CONFIRM = `POST /readings/${READING_ID}/confirm`;
const confirmData = encodeAction({ kind: 'confirm', batchId: BATCH_ID, readingId: READING_ID });

const textMessage = (
  text: string,
  from: typeof STRANGER | undefined = { ...STRANGER, id: CHAT_ID },
) =>
  ({
    message_id: 1,
    date: 0,
    chat: { id: CHAT_ID, type: 'private', first_name: 'Owner' },
    from,
    text,
    entities: text.startsWith('/')
      ? [{ type: 'bot_command', offset: 0, length: text.length }]
      : undefined,
  }) as Parameters<typeof messageUpdate>[0];

// BotService wires its handlers in the constructor; updates go through bot.handleUpdates — the polling path, so
// bot.catch handles a failing handler as in production.
function setup(options: BotServicesOptions = {}) {
  const s = botServices(options);
  // handleUpdates is what polling calls (it runs bot.catch); private in grammY's types, public at runtime.
  const bot = s.telegram.bot as unknown as { handleUpdates(updates: Update[]): Promise<void> };
  const deliver = async (...updates: Update[]) => {
    await bot.handleUpdates(updates);
    // Let the intake's album buffer run out and its upload finish.
    await vi.advanceTimersByTimeAsync(SILENCE_MS);
    await s.intake.flush();
  };
  const sent = () =>
    s.telegram.calls.filter((c) => c.method === 'sendMessage').map((c) => c.payload.text);
  return { ...s, deliver, sent };
}

describe('BotService (the update pipeline)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('the allowlist', () => {
    it.each([
      ['a command', messageUpdate(textMessage('/start', STRANGER))],
      ['a photo', messageUpdate(photoMessage(10, { from: STRANGER }))],
      [
        'a file that is not an image',
        messageUpdate(documentMessage(11, { mime: 'application/pdf' }, { from: STRANGER })),
      ],
      ['a button tap', callbackUpdate(confirmData, { from: STRANGER })],
    ])('ignores %s from a stranger: no API request, no Telegram call', async (_, update) => {
      const s = setup();
      await s.deliver(update);
      expect(s.requests).toEqual([]);
      expect(s.telegram.calls).toEqual([]);
      expect(s.logs.warn).toHaveBeenCalledWith('Ignored update from user 999');
    });

    it('ignores an update without a sender', async () => {
      const s = setup();
      await s.deliver(messageUpdate({ ...textMessage('/start'), from: undefined }));
      expect(s.requests).toEqual([]);
      expect(s.telegram.calls).toEqual([]);
      expect(s.logs.warn).toHaveBeenCalledWith('Ignored update from user unknown');
    });

    it('lets in every allowed user', async () => {
      const s = setup({ allowedUserIds: `${CHAT_ID}, 999` });
      await s.deliver(messageUpdate(textMessage('/help', STRANGER)));
      expect(s.sent()).toEqual([MESSAGES.help]);
    });
  });

  it.each([
    ['/start', MESSAGES.start],
    ['/help', MESSAGES.help],
  ])('answers %s', async (command, text) => {
    const s = setup();
    await s.deliver(messageUpdate(textMessage(command)));
    expect(s.sent()).toEqual([text]);
    expect(s.requests).toEqual([]);
  });

  it('hands a photo to the intake (upload + reply)', async () => {
    const s = setup({ routes: { 'POST /photos': json([{ id: 'p1', duplicate: false }], 201) } });
    await s.deliver(messageUpdate(photoMessage(20)));
    expect(s.requests.map((r) => `${r.method} ${r.url}`)).toEqual(['POST /photos']);
    expect(s.sent()).toEqual(['Прийнято 1 фото, розпізнаю…']);
  });

  it('hands an image file to the intake, and answers a non-image file', async () => {
    const s = setup({ routes: { 'POST /photos': json([{ id: 'p1', duplicate: false }], 201) } });
    await s.deliver(
      messageUpdate(documentMessage(21, { name: 'bill.pdf', mime: 'application/pdf' })),
    );
    expect(s.sent()).toEqual([MESSAGES.notAnImage]);
    await s.deliver(messageUpdate(documentMessage(22, { name: 'meter.png', mime: 'image/png' })));
    expect(s.requests.map((r) => `${r.method} ${r.url}`)).toEqual(['POST /photos']);
  });

  it('hands a button tap to the buttons (API call + one answer)', async () => {
    const s = setup({
      routes: { [CONFIRM]: json({}), [`GET /photo-batches/${BATCH_ID}`]: json(batch()) },
    });
    await s.deliver(callbackUpdate(confirmData));
    expect(s.requests.map((r) => `${r.method} ${r.url}`)).toEqual([
      CONFIRM,
      `GET /photo-batches/${BATCH_ID}`,
    ]);
    expect(s.telegram.calls.map((c) => c.method)).toEqual([
      'answerCallbackQuery',
      'editMessageText',
    ]);
  });

  describe('a failing handler', () => {
    it('is logged and answered with the generic error; polling goes on', async () => {
      const s = setup({
        telegram: {
          routes: {
            sendMessage: (p) =>
              p.text === MESSAGES.start
                ? telegramError(500, 'Internal Server Error')
                : { message_id: 2, date: 0, chat: { id: CHAT_ID, type: 'private' }, text: p.text },
          },
        },
      });
      const update = messageUpdate(textMessage('/start'));
      await expect(s.deliver(update)).resolves.toBeUndefined();
      expect(s.sent()).toEqual([MESSAGES.start, MESSAGES.error]);
      expect(s.logs.error).toHaveBeenCalledWith(
        expect.stringMatching(
          new RegExp(`^Update ${update.update_id} failed: GrammyError: .*Internal Server Error`),
        ),
      );
    });

    it('still resolves when the error reply fails too', async () => {
      const s = setup({
        telegram: {
          routes: { sendMessage: () => telegramError(403, 'Forbidden: bot was blocked') },
        },
      });
      await expect(s.deliver(messageUpdate(textMessage('/help')))).resolves.toBeUndefined();
      expect(s.sent()).toEqual([MESSAGES.help, MESSAGES.error]);
      expect(s.logs.error).toHaveBeenCalledOnce();
    });
  });
});
