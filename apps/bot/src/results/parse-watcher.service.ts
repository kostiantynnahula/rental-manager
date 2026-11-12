import { Injectable, Logger } from '@nestjs/common';
import { type Api, InlineKeyboard } from 'grammy';
import { ApiCallError } from './helpers/api-call-error.js';
import type { WatchedPhoto } from './interfaces/watched-photo.interface.js';
import { type Photo, ResultsApiService } from './results-api.service.js';
import { ResultsStateService } from './results-state.service.js';
import { SummaryService } from './summary.service.js';

const POLL_MS = 3000;
const TIMEOUT_MS = 5 * 60 * 1000;

// Waits for the worker to parse a batch of photos (GET /photos/:id every 3 s while PENDING, ≤ 5 min), then shows
// the results: one summary of the readings found, a reply with apartment buttons per NOT_MATCHED photo, the error
// per FAILED one. In memory: a restart loses only these messages (photos and drafts are in the API).
@Injectable()
export class ParseWatcherService {
  private readonly logger = new Logger(ParseWatcherService.name);
  private readonly running = new Set<Promise<void>>();
  private stopped = false;
  private readonly sleeping = new Set<() => void>();

  constructor(
    private readonly api: ResultsApiService,
    private readonly summary: SummaryService,
    private readonly state: ResultsStateService,
  ) {}

  // Fire and forget: the work is tracked here and stopped by stop().
  watch(tg: Api, chatId: number, photos: WatchedPhoto[]): void {
    if (this.stopped || photos.length === 0) return;
    const job = this.run(tg, chatId, photos).catch((error: unknown) => {
      const { name, message } = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Results for chat ${chatId} failed: ${name}: ${message}`);
    });
    this.running.add(job);
    void job.finally(() => this.running.delete(job));
  }

  // Shutdown: stop polling, send nothing more.
  async stop(): Promise<void> {
    this.stopped = true;
    for (const wake of this.sleeping) wake();
    await Promise.allSettled([...this.running]);
  }

  private async run(tg: Api, chatId: number, photos: WatchedPhoto[]): Promise<void> {
    const settled = await this.waitForParse(photos);
    if (this.stopped) return;

    const withReadings = settled.flatMap(({ watched, photo }) =>
      photo && photo.readings.length > 0 ? [{ watched, photo }] : [],
    );
    if (withReadings.length > 0) {
      const message = await this.summary.build(withReadings.map((s) => s.photo));
      const sent = await tg.sendMessage(chatId, message.text, {
        reply_markup: message.keyboard,
        reply_parameters: {
          message_id: withReadings[0].watched.messageId,
          allow_sending_without_reply: true,
        },
      });
      this.state.rememberSummary(
        chatId,
        sent.message_id,
        withReadings.map((s) => s.photo.id),
      );
    }

    for (const { watched, photo } of settled) {
      if (photo && photo.readings.length > 0) continue;
      await this.replyWithoutReadings(tg, chatId, watched, photo);
    }
  }

  private async replyWithoutReadings(
    tg: Api,
    chatId: number,
    watched: WatchedPhoto,
    photo: Photo | null | undefined,
  ): Promise<void> {
    const reply = {
      reply_parameters: { message_id: watched.messageId, allow_sending_without_reply: true },
    };
    if (photo === undefined) {
      await tg.sendMessage(
        chatId,
        'Не вдалося отримати результат — перевірте у вебі (Вхідні).',
        reply,
      );
      return;
    }
    if (!photo) {
      await tg.sendMessage(chatId, 'Фото не знайдено (можливо, його видалили у вебі).', reply);
      return;
    }
    const note = photo.parseNote ? `\n${photo.parseNote}` : '';
    if (photo.parseStatus === 'PENDING') {
      await tg.sendMessage(
        chatId,
        'Фото ще розпізнається — перевірте пізніше у вебі (Вхідні).',
        reply,
      );
    } else if (photo.parseStatus === 'FAILED') {
      await tg.sendMessage(chatId, `Помилка розпізнавання.${note}`, reply);
    } else if (photo.parseStatus === 'NOT_MATCHED') {
      const keyboard = new InlineKeyboard();
      for (const a of await this.api.apartments()) {
        const action = {
          kind: 'assign',
          photoId: photo.id,
          apartmentId: a.id,
          apartmentName: a.name,
        } as const;
        keyboard.text(a.name, this.state.callbackData(action)).row();
      }
      await tg.sendMessage(chatId, `Показання не розпізнано.${note}\n\nОберіть квартиру:`, {
        ...reply,
        reply_markup: keyboard,
      });
    } else {
      // PARSED without readings (they were deleted since), or a photo from before parsing existed.
      await tg.sendMessage(chatId, 'Показань з цього фото немає.', reply);
    }
  }

  // Each photo's last known state: null = gone (404), undefined = never fetched (API unreachable). Photos still
  // PENDING at the timeout come back as PENDING.
  private async waitForParse(
    photos: WatchedPhoto[],
  ): Promise<{ watched: WatchedPhoto; photo: Photo | null | undefined }[]> {
    const latest = new Map<string, Photo | null | undefined>();
    const deadline = Date.now() + TIMEOUT_MS;
    for (;;) {
      for (const w of photos) {
        const known = latest.get(w.photoId);
        if (known === null || (known && known.parseStatus !== 'PENDING')) continue;
        latest.set(w.photoId, await this.fetch(w.photoId, known));
      }
      const pending = photos.some((w) => {
        const p = latest.get(w.photoId);
        return p === undefined || p?.parseStatus === 'PENDING';
      });
      if (!pending || this.stopped || Date.now() >= deadline) break;
      await this.sleep(POLL_MS);
    }
    return photos.map((w) => ({ watched: w, photo: latest.get(w.photoId) }));
  }

  // A failed poll (API down for a moment) keeps the previous state and is tried again next round.
  private async fetch(id: string, previous: Photo | undefined): Promise<Photo | null | undefined> {
    try {
      return await this.api.photo(id);
    } catch (error) {
      if (error instanceof ApiCallError && error.status === 404) return null;
      const { message } = error instanceof Error ? error : new Error(String(error));
      this.logger.warn(`Polling photo ${id} failed: ${message}`);
      return previous;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        this.sleeping.delete(done);
        resolve();
      };
      const timer = setTimeout(done, ms);
      this.sleeping.add(done);
    });
  }
}
