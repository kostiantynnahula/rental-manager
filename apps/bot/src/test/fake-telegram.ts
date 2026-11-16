import { Bot, Context, type Transformer } from 'grammy';
import type { Message, Update, UserFromGetMe } from 'grammy/types';
import { expect, onTestFinished, vi } from 'vitest';

// The token of every fake Bot: it shows up in download URLs, so tests can check it never leaks.
export const TEST_TOKEN = '123456:TEST-TOKEN';

export const BOT_INFO: UserFromGetMe = {
  id: 123456,
  is_bot: true,
  first_name: 'Test bot',
  username: 'test_bot',
  can_join_groups: false,
  can_read_all_group_messages: false,
  can_manage_bots: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
  has_topics_enabled: false,
  allows_users_to_create_topics: false,
  supports_join_request_queries: false,
};

// One Bot API call the code under test made.
export interface TelegramCall {
  method: string;
  payload: Record<string, unknown>;
}

// A Bot API refusal: returned from a route, grammY throws it as a real GrammyError.
export interface TelegramFailure {
  ok: false;
  error_code: number;
  description: string;
}

export function telegramError(code: number, description: string): TelegramFailure {
  return { ok: false, error_code: code, description };
}

// Method → its result, built from the payload; throw = a network error.
export type TelegramRoute = (payload: Record<string, unknown>) => unknown;
// A file URL path (`photos/<file_id>.jpg`) → its bytes, a Response, or an Error (thrown by fetch).
export type TelegramFile = Uint8Array<ArrayBuffer> | Response | Error;

export interface FakeTelegramOptions {
  routes?: Record<string, TelegramRoute>;
  files?: Record<string, TelegramFile>;
  client?: { apiRoot?: string; environment?: 'prod' | 'test' };
}

let messageIds = 1000;

const DEFAULT_ROUTES: Record<string, TelegramRoute> = {
  sendMessage: (p) => ({
    message_id: ++messageIds,
    date: 0,
    chat: { id: p.chat_id, type: 'private', first_name: 'Owner' },
    text: p.text,
  }),
  getFile: (p) => ({
    file_id: p.file_id,
    file_unique_id: `u-${String(p.file_id)}`,
    file_path: `photos/${String(p.file_id)}.jpg`,
  }),
  answerCallbackQuery: () => true,
  editMessageText: () => true,
};

// A real grammY Bot whose transport is a transformer that never calls Telegram: it records every call and answers
// from `routes` (defaults above). An unknown method throws and also fails the test at its end. The file download
// (global fetch, see download-telegram-file.ts) is stubbed from `files` — default: 3 bytes for any file.
export function fakeTelegram({ routes = {}, files = {}, client }: FakeTelegramOptions = {}) {
  const bot = new Bot(TEST_TOKEN, { botInfo: BOT_INFO, client });
  const calls: TelegramCall[] = [];
  const downloads: string[] = [];
  const unknown: string[] = [];

  const transformer: Transformer = async (_prev, method, payload) => {
    const call = { method, payload: (payload ?? {}) as Record<string, unknown> };
    calls.push(call);
    const route = routes[method] ?? DEFAULT_ROUTES[method];
    if (!route) {
      unknown.push(method);
      throw new Error(`fakeTelegram: no route for ${method}`);
    }
    const result = route(call.payload);
    if (isFailure(result)) return result;
    return { ok: true, result } as never;
  };
  bot.api.config.use(transformer);

  vi.stubGlobal('fetch', async (input: string | URL | Request): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    downloads.push(url);
    const path = url.split('/').slice(-2).join('/');
    const file = files[path] ?? new Uint8Array([1, 2, 3]);
    if (file instanceof Error) throw file;
    if (file instanceof Response) return file;
    return new Response(file);
  });

  onTestFinished(() => {
    vi.unstubAllGlobals();
    expect(unknown, 'Bot API calls without a fakeTelegram route').toEqual([]);
  });

  return { bot, api: bot.api, calls, downloads };
}

function isFailure(value: unknown): value is TelegramFailure {
  return typeof value === 'object' && value !== null && 'ok' in value && value.ok === false;
}

export const CHAT_ID = 777;

// A compressed photo message (two sizes, the largest last).
export function photoMessage(
  messageId: number,
  overrides: Partial<Message> & { fileId?: string; fileSize?: number } = {},
): Message {
  const { fileId = `photo-${messageId}`, fileSize = 100_000, ...fields } = overrides;
  return {
    message_id: messageId,
    date: 0,
    chat: { id: CHAT_ID, type: 'private', first_name: 'Owner' },
    from: { id: CHAT_ID, is_bot: false, first_name: 'Owner' },
    photo: [
      { file_id: `${fileId}-small`, file_unique_id: `${fileId}-s`, width: 90, height: 90 },
      { file_id: fileId, file_unique_id: fileId, width: 1280, height: 960, file_size: fileSize },
    ],
    ...fields,
  } as Message;
}

// A file message (an image sent "as a file", or any other document).
export function documentMessage(
  messageId: number,
  document: { fileId?: string; name?: string; mime?: string; fileSize?: number } = {},
  overrides: Partial<Message> = {},
): Message {
  const { fileId = `doc-${messageId}`, name, mime = 'image/jpeg', fileSize } = document;
  return {
    message_id: messageId,
    date: 0,
    chat: { id: CHAT_ID, type: 'private', first_name: 'Owner' },
    from: { id: CHAT_ID, is_bot: false, first_name: 'Owner' },
    document: {
      file_id: fileId,
      file_unique_id: fileId,
      file_name: name,
      mime_type: mime,
      file_size: fileSize,
    },
    ...overrides,
  } as Message;
}

let updateIds = 1;

// A real grammY Context for one message: ctx.reply and ctx.api go through the fake transport.
export function contextFor(bot: Bot, message: Message): Context {
  const update = { update_id: updateIds++, message } as Update;
  return new Context(update, bot.api, bot.botInfo);
}
