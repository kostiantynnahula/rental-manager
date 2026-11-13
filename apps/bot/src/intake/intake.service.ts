import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Context } from 'grammy';
import { API_CLIENT, type ApiClient } from '../api/api-client.js';
import { Env } from '../config/env.validation.js';
import { intakeReply, MESSAGES, photoName } from '../messages.js';
import { AlbumBuffer } from './album-buffer.js';
import {
  downloadTelegramFile,
  TELEGRAM_MAX_DOWNLOAD_BYTES,
} from './helpers/download-telegram-file.js';
import { incomingPhoto } from './helpers/incoming-photo.js';
import { uploadPhotos } from './helpers/upload-photos.js';
import type { BufferedPhoto } from './interfaces/buffered-photo.interface.js';
import type { IntakeResult } from './interfaces/intake-result.interface.js';
import type { RejectReason } from './interfaces/reject-reason.interface.js';
import type { RejectedPhoto } from './interfaces/rejected-photo.interface.js';
import type { UploadFile } from './interfaces/upload-file.interface.js';

// An album arrives as one update per photo, a few hundred ms apart; this much silence ends a batch.
const SILENCE_MS = 1500;
// Telegram albums have at most 10 photos; also the API's default PHOTO_MAX_FILES, so a run of single photos is
// cut into requests the API accepts.
const MAX_FILES = 10;

// Photos sent to the bot → the API inbox: one album (or photos sent in a row) = one POST /photos = one batch
// (one batchId; replyTo brings the bot's answer back here once parsed) and one reply. Depends only on api/.
@Injectable()
export class IntakeService {
  private readonly logger = new Logger(IntakeService.name);
  // The smaller of what Telegram lets us download and what the API accepts.
  private readonly maxBytes: number;
  private readonly inFlight = new Set<Promise<void>>();
  private readonly buffer = new AlbumBuffer<BufferedPhoto>(SILENCE_MS, MAX_FILES, (items) =>
    this.track(this.process(items)),
  );

  constructor(
    config: ConfigService<Env, true>,
    @Inject(API_CLIENT) private readonly api: ApiClient,
  ) {
    const apiLimit = config.get('PHOTO_MAX_FILE_SIZE_MB', { infer: true }) * 1024 * 1024;
    this.maxBytes = Math.min(TELEGRAM_MAX_DOWNLOAD_BYTES, apiLimit);
  }

  // The update handler: only buffers (returns at once), the batch is uploaded after the silence.
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
    this.buffer.add(key, {
      api: ctx.api,
      chatId: message.chat.id,
      messageId: message.message_id,
      photo,
    });
  }

  // Shutdown, after polling stopped (nothing calls add() any more): upload what is buffered and wait for it.
  async flush(): Promise<void> {
    this.buffer.flushAll();
    await Promise.allSettled([...this.inFlight]);
  }

  private track(job: Promise<void>): void {
    this.inFlight.add(job);
    void job.finally(() => this.inFlight.delete(job));
  }

  // Runs from a timer, outside grammY's middleware (bot.catch doesn't see it): never throws.
  private async process(items: BufferedPhoto[]): Promise<void> {
    const { api, chatId, messageId } = items[0];
    const result = await this.upload(items, `${chatId}:${messageId}`);
    this.logger.log(
      `Chat ${chatId}: ${items.length} photo(s) → ${result.accepted} accepted, ${result.duplicates} duplicate(s), ` +
        `${result.rejected.length} rejected`,
    );
    try {
      await api.sendMessage(chatId, intakeReply(result), {
        reply_parameters: { message_id: messageId, allow_sending_without_reply: true },
      });
    } catch (error) {
      // The photos are in the inbox already: a failed reply is only logged.
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Reply to chat ${chatId} failed: ${err.name}: ${err.message}`);
    }
  }

  // Download everything, then one request; a file the API rejects (400 files[i]) is dropped and the rest sent again.
  private async upload(items: BufferedPhoto[], replyTo: string): Promise<IntakeResult> {
    const rejected: RejectedPhoto[] = [];
    let files: UploadFile[] = [];
    for (const [i, { api, photo }] of items.entries()) {
      const name = photo.displayName ?? photoName(i + 1);
      const file = await this.download(api, photo.fileId, photo.fileSize, name);
      if ('reason' in file) rejected.push(file);
      else files.push({ ...file, filename: photo.filename });
    }
    const rejectAll = (reason: RejectReason): IntakeResult => ({
      accepted: 0,
      duplicates: 0,
      rejected: [...rejected, ...files.map((f) => ({ name: f.name, reason }))],
    });

    while (files.length > 0) {
      const response = await uploadPhotos(this.api, files, replyTo);
      switch (response.kind) {
        case 'stored': {
          const duplicates = response.duplicates.filter(Boolean).length;
          return { accepted: response.duplicates.length - duplicates, duplicates, rejected };
        }
        case 'bad-file':
          rejected.push({ name: files[response.index].name, reason: 'unsupported' });
          files = files.filter((_, j) => j !== response.index);
          continue;
        case 'too-large':
          return rejectAll('too-large');
        case 'unauthorized':
          // A retry can't help: the key is wrong, revoked or lacks the scope.
          this.logger.error(
            `Upload refused: HTTP ${response.status} — check BOT_API_KEY and its scope photos:upload`,
          );
          return rejectAll('unauthorized');
        case 'failed':
          this.logger.error(`Upload failed: ${response.detail}`);
          return rejectAll('failed');
      }
    }
    return { accepted: 0, duplicates: 0, rejected };
  }

  // Never throws: a file that can't be fetched is rejected, the rest of the batch goes on.
  private async download(
    api: BufferedPhoto['api'],
    fileId: string,
    fileSize: number | undefined,
    name: string,
  ): Promise<Omit<UploadFile, 'filename'> | RejectedPhoto> {
    // file_size is optional in the Bot API: then the downloaded size decides.
    if ((fileSize ?? 0) > this.maxBytes) return { name, reason: 'too-large' };
    try {
      const bytes = await downloadTelegramFile(api, fileId);
      if (bytes.byteLength > this.maxBytes) return { name, reason: 'too-large' };
      return { bytes, name };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Download of ${name} failed: ${err.name}: ${err.message}`);
      return { name, reason: 'download-failed' };
    }
  }
}
