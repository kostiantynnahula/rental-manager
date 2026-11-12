import { Injectable, Logger } from '@nestjs/common';
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

// An album arrives as one update per photo, a few hundred ms apart; this much silence after the last upload
// ends a batch.
const BATCH_SILENCE_MS = 1500;

interface UploadedPhoto {
  api: Api;
  chatId: number;
  outcome: UploadOutcome;
}

// Photos sent to the bot → the API inbox, one reply per batch (an album, or single photos in a row).
// Each photo is uploaded inside its update handler: grammY confirms an update to Telegram only after the handler
// returns, so a crash mid-upload means Telegram sends it again after a restart (a repeat is a sha256 duplicate,
// never a second photo). Only the reply is batched; a crash before it loses the reply, never a photo.
@Injectable()
export class PhotoIntakeService {
  private readonly logger = new Logger(PhotoIntakeService.name);
  // The smaller of what Telegram lets us download and what the API accepts.
  private readonly maxBytes: number;
  private readonly inFlight = new Set<Promise<void>>();
  private readonly batcher = new PhotoBatcher<UploadedPhoto>(BATCH_SILENCE_MS, (items) =>
    this.track(this.sendReply(items)),
  );

  constructor(
    config: ConfigService<Env, true>,
    private readonly uploader: PhotoUploaderService,
  ) {
    const apiLimit = config.get('PHOTO_MAX_FILE_SIZE_MB', { infer: true }) * 1024 * 1024;
    this.maxBytes = Math.min(TELEGRAM_MAX_DOWNLOAD_BYTES, apiLimit);
  }

  // Awaits this photo's upload (see above), not the batch: grammY handles updates one by one, so the album's next
  // photo comes after it. Photos are uploaded in the order they were sent.
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
    this.batcher.hold(key);
    const outcome = await this.uploadOne(ctx.api, photo);
    this.batcher.add(key, { api: ctx.api, chatId: message.chat.id, outcome });
  }

  // Shutdown (called by TelegramBotService after polling has stopped, so no add() can follow): send the replies
  // still waiting and wait for them. Not a Nest hook: Nest runs hooks concurrently.
  async drain(): Promise<void> {
    this.batcher.flushAll();
    await Promise.allSettled([...this.inFlight]);
  }

  private track(job: Promise<void>): void {
    this.inFlight.add(job);
    void job.finally(() => this.inFlight.delete(job));
  }

  // Runs from a timer, outside grammY's middleware (bot.catch doesn't see it). The photos are already uploaded,
  // so a failed reply is only logged (telling the user to try again would make them resend the album).
  private async sendReply(items: UploadedPhoto[]): Promise<void> {
    const { api, chatId } = items[0];
    const outcomes = items.map((i) => i.outcome);
    this.logger.log(`Chat ${chatId}: ${items.length} photo(s) → ${outcomes.join(', ')}`);
    try {
      await api.sendMessage(chatId, batchReply(outcomes));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Batch reply to chat ${chatId} failed: ${err.name}: ${err.message}`);
    }
  }

  // Never throws: a failed photo is an outcome, so the rest of the album still goes through.
  private async uploadOne(api: Api, photo: IncomingPhoto): Promise<UploadOutcome> {
    // file_size is optional in the Bot API: then the downloaded size decides, before the upload.
    if ((photo.fileSize ?? 0) > this.maxBytes) return 'too-large';
    try {
      const bytes = await downloadTelegramFile(api, photo.fileId);
      if (bytes.byteLength > this.maxBytes) return 'too-large';
      return await this.uploader.upload(bytes, photo.filename);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Photo ${photo.filename} failed: ${err.name}: ${err.message}`);
      return 'failed';
    }
  }
}
