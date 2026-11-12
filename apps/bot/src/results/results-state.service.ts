import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ExpiringMap } from './helpers/expiring-map.js';
import type { ResultAction } from './interfaces/result-action.interface.js';

const TTL_MS = 24 * 60 * 60 * 1000;

// Prefixes of callback_data (≤ 64 bytes): `rc:<uuid>` / `rx:<uuid>` = 39, `a:<token>` = 10.
const CONFIRM = 'rc:';
const CANCEL = 'rx:';
const TOKEN = 'a:';
export const RESULT_CALLBACK = /^(rc|rx|a):/;

// In-memory state behind the result buttons (single process, 24 h, lost on restart):
// - tokens for actions too big for callback_data (confirm all, assign an apartment);
// - which photos a summary message shows, so it can be re-rendered from the API after a tap.
@Injectable()
export class ResultsStateService {
  private readonly actions = new ExpiringMap<string, ResultAction>(TTL_MS);
  private readonly summaries = new ExpiringMap<string, string[]>(TTL_MS);

  callbackData(action: ResultAction): string {
    if (action.kind === 'confirm') return CONFIRM + action.readingId;
    if (action.kind === 'cancel') return CANCEL + action.readingId;
    const token = randomBytes(6).toString('base64url');
    this.actions.set(token, action);
    return TOKEN + token;
  }

  // undefined = a stale token (restart or expired).
  action(data: string): ResultAction | undefined {
    if (data.startsWith(CONFIRM)) return { kind: 'confirm', readingId: data.slice(CONFIRM.length) };
    if (data.startsWith(CANCEL)) return { kind: 'cancel', readingId: data.slice(CANCEL.length) };
    if (data.startsWith(TOKEN)) return this.actions.get(data.slice(TOKEN.length));
    return undefined;
  }

  // One-shot actions (assign, confirm all): a second tap finds nothing.
  forget(data: string): void {
    if (data.startsWith(TOKEN)) this.actions.delete(data.slice(TOKEN.length));
  }

  rememberSummary(chatId: number, messageId: number, photoIds: string[]): void {
    this.summaries.set(`${chatId}:${messageId}`, photoIds);
  }

  summaryPhotos(chatId: number, messageId: number): string[] | undefined {
    return this.summaries.get(`${chatId}:${messageId}`);
  }
}
