import { json, status, type Routes } from '@rental/testing';
import { TAP_TEXTS } from '../messages.js';
import { botServices } from '../test/bot-services.js';
import { BATCH_ID, batch, PHOTO_ID, READING_ID, uuid } from '../test/builders.js';
import {
  callbackContext,
  CHAT_ID,
  SUMMARY_MESSAGE_ID,
  telegramError,
  type CallbackOptions,
  type FakeTelegramOptions,
} from '../test/fake-telegram.js';
import type { ButtonAction } from './interfaces/button-action.interface.js';
import { encodeAction } from './render/callback-data.js';

const BATCH = `GET /photo-batches/${BATCH_ID}`;
const CONFIRM = `POST /readings/${READING_ID}/confirm`;
const CANCEL = `POST /readings/${READING_ID}/cancel`;
const CONFIRM_ALL = `POST /photo-batches/${BATCH_ID}/confirm`;
const ASSIGN = `PATCH /photos/${PHOTO_ID}`;
const APARTMENT_ID = uuid(30);

const confirm: ButtonAction = { kind: 'confirm', batchId: BATCH_ID, readingId: READING_ID };
const cancel: ButtonAction = { kind: 'cancel', batchId: BATCH_ID, readingId: READING_ID };
const confirmAll: ButtonAction = { kind: 'confirm-batch', batchId: BATCH_ID };
const assign: ButtonAction = { kind: 'assign', photoId: PHOTO_ID, apartmentId: APARTMENT_ID };

// Taps a button and returns what the bot did: API requests (without the refresh's GET), the callback answers and
// the message edits.
async function tap(
  data: string | ButtonAction,
  {
    routes = {},
    telegram,
    ...options
  }: { routes?: Routes; telegram?: FakeTelegramOptions } & CallbackOptions = {},
) {
  const s = botServices({ routes: { [BATCH]: json(batch()), ...routes }, telegram });
  const raw = typeof data === 'string' ? data : encodeAction(data);
  await s.buttons.handle(callbackContext(s.telegram.bot, raw, options));
  const calls = (method: string) =>
    s.telegram.calls.filter((c) => c.method === method).map((c) => c.payload);
  return {
    ...s,
    actions: s.requests
      .filter((r) => r.method !== 'GET')
      .map((r) => ({ key: `${r.method} ${r.url}`, body: r.body })),
    refreshed: s.requests.filter((r) => r.method === 'GET').map((r) => r.url),
    answers: calls('answerCallbackQuery'),
    edits: calls('editMessageText'),
  };
}

const answer = (text: string, alert: boolean) => [
  { callback_query_id: expect.any(String), text, show_alert: alert },
];

describe('ButtonsHandler', () => {
  describe('actions', () => {
    it('confirms a reading, answers once with a toast, then re-renders the summary', async () => {
      const t = await tap(confirm, { routes: { [CONFIRM]: json({}) } });
      expect(t.actions).toEqual([{ key: CONFIRM, body: undefined }]);
      expect(t.answers).toEqual(answer(TAP_TEXTS.confirmed, false));
      expect(t.refreshed).toEqual([`/photo-batches/${BATCH_ID}`]);
      expect(t.edits).toEqual([
        expect.objectContaining({ chat_id: CHAT_ID, message_id: SUMMARY_MESSAGE_ID }),
      ]);
    });

    it('cancels a reading with the Telegram reason', async () => {
      const t = await tap(cancel, { routes: { [CANCEL]: json({}) } });
      expect(t.actions).toEqual([{ key: CANCEL, body: { reason: 'Скасовано в Telegram' } }]);
      expect(t.answers).toEqual(answer(TAP_TEXTS.cancelled, false));
      expect(t.edits).toHaveLength(1);
    });

    it.each([
      [['r1', 'r2'], 'Підтверджено: 2'],
      [[], 'Нічого підтверджувати'],
    ])('confirms a batch (confirmed %j)', async (confirmed, text) => {
      const t = await tap(confirmAll, {
        routes: { [CONFIRM_ALL]: json({ confirmed, refused: [] }) },
      });
      expect(t.actions.map((a) => a.key)).toEqual([CONFIRM_ALL]);
      expect(t.answers).toEqual(answer(text, false));
      expect(t.edits).toHaveLength(1);
    });

    it('shows the reasons of a batch confirm refusal as an alert', async () => {
      const refused = [
        { readingId: uuid(40), reason: 'A confirmed reading for this period already exists' },
        { readingId: uuid(41), reason: 'Reading date is in the future' },
      ];
      const t = await tap(confirmAll, {
        routes: { [CONFIRM_ALL]: json({ confirmed: [uuid(42)], refused }) },
      });
      expect(t.answers).toEqual(
        answer(
          'Не підтверджено:\nA confirmed reading for this period already exists\nReading date is in the future',
          true,
        ),
      );
      expect(t.edits).toHaveLength(1);
    });

    it('assigns an apartment and refreshes the batch from the PATCH response', async () => {
      const otherBatch = uuid(99);
      const t = await tap(assign, {
        routes: {
          [ASSIGN]: json({ id: PHOTO_ID, batchId: otherBatch }),
          [`GET /photo-batches/${otherBatch}`]: json(batch({ batchId: otherBatch })),
        },
      });
      expect(t.actions).toEqual([{ key: ASSIGN, body: { apartmentId: APARTMENT_ID } }]);
      expect(t.answers).toEqual(answer(TAP_TEXTS.reparsing, false));
      expect(t.refreshed).toEqual([`/photo-batches/${otherBatch}`]);
    });
  });

  describe('API refusals', () => {
    it.each([400, 404, 409])(
      'answers %i with an alert carrying the API message, and still refreshes',
      async (code) => {
        const t = await tap(confirm, {
          routes: { [CONFIRM]: status(code, { message: 'Only DRAFT readings can be confirmed' }) },
        });
        expect(t.answers).toEqual(answer('Only DRAFT readings can be confirmed', true));
        expect(t.edits).toHaveLength(1);
      },
    );

    it('joins a list of validation messages', async () => {
      const t = await tap(cancel, {
        routes: { [CANCEL]: status(400, { message: ['reason too long', 'reason is required'] }) },
      });
      expect(t.answers).toEqual(answer('reason too long; reason is required', true));
    });

    it.each([
      ['HTTP 500', status(500, { message: 'Internal server error' })],
      ['HTTP 403', status(403, { message: 'Forbidden resource' })],
      ['a 409 without a message', status(409)],
    ])('answers the generic failure on %s and logs it', async (_, response) => {
      const t = await tap(confirm, { routes: { [CONFIRM]: response } });
      expect(t.answers).toEqual(answer(TAP_TEXTS.failed, true));
      expect(t.logs.error).toHaveBeenCalledWith(expect.stringContaining('API refused a tap: HTTP'));
    });

    it('answers the generic failure on a network error, without refreshing', async () => {
      const t = await tap(confirm, {
        routes: {
          [CONFIRM]: () => {
            throw new TypeError('fetch failed');
          },
        },
      });
      expect(t.answers).toEqual(answer(TAP_TEXTS.failed, true));
      expect(t.edits).toEqual([]);
      expect(t.logs.error).toHaveBeenCalledWith('Button confirm failed: TypeError: fetch failed');
    });

    it('answers a failed assign without a refresh (no batch known)', async () => {
      const t = await tap(assign, {
        routes: { [ASSIGN]: status(404, { message: 'Photo not found' }) },
      });
      expect(t.answers).toEqual(answer('Photo not found', true));
      expect(t.refreshed).toEqual([]);
      expect(t.edits).toEqual([]);
    });

    it('cuts an answer to Telegram’s 200 characters', async () => {
      const t = await tap(confirm, {
        routes: { [CONFIRM]: status(409, { message: 'x'.repeat(300) }) },
      });
      expect(t.answers[0].text).toBe('x'.repeat(200));
    });
  });

  describe('stale buttons', () => {
    it.each([
      ['a button of the old bot', 'a:sometoken'],
      ['garbage', 'not-callback-data'],
      ['a known prefix with a bad id', 'rc:short:ids'],
    ])('answers «stale» to %s, without calling the API', async (_, data) => {
      const t = await tap(data);
      expect(t.requests).toEqual([]);
      expect(t.answers).toEqual(answer(TAP_TEXTS.stale, true));
      expect(t.edits).toEqual([]);
    });

    it('answers «stale» when Telegram sends the tap without its message', async () => {
      const t = await tap(confirm, { message: null });
      expect(t.requests).toEqual([]);
      expect(t.answers).toEqual(answer(TAP_TEXTS.stale, true));
    });
  });

  it('only logs a failed refresh: the action is done', async () => {
    const t = await tap(confirm, {
      routes: { [CONFIRM]: json({}) },
      telegram: {
        routes: {
          editMessageText: () => telegramError(400, "Bad Request: message can't be edited"),
        },
      },
    });
    expect(t.answers).toEqual(answer(TAP_TEXTS.confirmed, false));
    expect(t.logs.error).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(`^Refresh of batch ${BATCH_ID} failed: GrammyError: .*can't be edited`),
      ),
    );
  });
});
