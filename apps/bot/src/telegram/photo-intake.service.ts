import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Api, Context } from 'grammy';
import { Env } from '../config/env.validation.js';
import { PhotoUploaderService } from '../photos/photo-uploader.service.js';
import type { UploadOutcome } from '../photos/upload-outcome.js';
import {
  downloadTelegramFile,
  TELEGRAM_MAX_DOWNLOAD_BYTES,
} from './helpers/download-telegram-file.js';
import { incomingPhoto } from './helpers/incoming-photo.js';
import { PhotoBatcher } from './helpers/photo-batcher.js';
import type { IncomingPhoto } from './interfaces/incoming-photo.interface.js';
import { batchReply, MESSAGES } from './messages.js';

// An album arrives as one update per photo, a few hundred ms apart; this much silence ends a batch.
const BATCH_SILENCE_MS = 1500;

interface QueuedPhoto {
  api: Api;
  chatId: number;
  photo: IncomingPhoto;
}

// Photos sent to the bot → the API inbox, one reply per batch (an album, or single photos in a row).
@Injectable()
export class PhotoIntakeService implements OnApplicationShutdown {
  private readonly logger = new Logger(PhotoIntakeService.name);
  private readonly token: string;
  private readonly inFlight = new Set<Promise<void>>();
  private readonly batcher = new PhotoBatcher<QueuedPhoto>(BATCH_SILENCE_MS, (items) =>
    this.track(this.processBatch(items)),
  );

  constructor(
    config: ConfigService<Env, true>,
    private readonly uploader: PhotoUploaderService,
  ) {
    this.token = config.get('TELEGRAM_BOT_TOKEN', { infer: true });
  }

  // Returns at once: grammY handles updates one by one, so awaiting the batch here would hold back the album's
  // next photo.
  async add(ctx: Context): Promise<void> {
    const message = ctx.message;
    if (!message) return;
    const photo = incomingPhoto(message);
    if (!photo) {
      await ctx.reply(MESSAGES.notAnImage);
      return;
    }
    const key = message.media_group_id
      ? `album:${message.media_group_id}`
      : `chat:${message.chat.id}`;
    this.batcher.add(key, { api: ctx.api, chatId: message.chat.id, photo });
  }

  // Ctrl+C / SIGTERM: send what is still buffered and wait for it, so no photo is dropped.
  async onApplicationShutdown(): Promise<void> {
    this.batcher.flushAll();
    await Promise.allSettled([...this.inFlight]);
  }

  private track(job: Promise<void>): void {
    this.inFlight.add(job);
    void job.finally(() => this.inFlight.delete(job));
  }

  // Runs outside grammY's middleware, so bot.catch doesn't see its errors: handled here.
  private async processBatch(items: QueuedPhoto[]): Promise<void> {
    const { api, chatId } = items[0];
    try {
      const outcomes: UploadOutcome[] = [];
      // In order, one at a time: the inbox lists them as sent, and the API isn't hit with 10 uploads at once.
      for (const item of items) outcomes.push(await this.uploadOne(item));
      this.logger.log(`Chat ${chatId}: ${items.length} photo(s) → ${outcomes.join(', ')}`);
      await api.sendMessage(chatId, batchReply(outcomes));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Photo batch for chat ${chatId} failed: ${err.name}: ${err.message}`);
      try {
        await api.sendMessage(chatId, MESSAGES.error);
      } catch {
        // Telegram is unreachable: already logged.
      }
    }
  }

  private async uploadOne({ api, photo }: QueuedPhoto): Promise<UploadOutcome> {
    if ((photo.fileSize ?? 0) > TELEGRAM_MAX_DOWNLOAD_BYTES) return 'too-large';
    try {
      const bytes = await downloadTelegramFile(api, this.token, photo.fileId);
      return await this.uploader.upload(bytes, photo.filename);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Photo ${photo.filename} failed: ${err.name}: ${err.message}`);
      return 'failed';
    }
  }
}
