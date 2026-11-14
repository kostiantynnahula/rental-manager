import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Api, GrammyError } from 'grammy';
import { API_CLIENT, type ApiClient } from '../api/api-client.js';
import { Env } from '../config/env.validation.js';
import { inlineKeyboard } from './helpers/inline-keyboard.js';
import { parseReplyTo } from './helpers/reply-target.js';
import type { RenderedSummary } from './interfaces/rendered-summary.interface.js';
import { renderSummary } from './render/summary.js';

// Sends a batch's summary (on `batch-parsed`) and re-renders it after a tap. Always loads fresh data from the API.
// Its own grammY Api (no dependency on BotService): the token is in it — never log it.
@Injectable()
export class ResultsSender {
  private readonly logger = new Logger(ResultsSender.name);
  private readonly telegram: Api;

  constructor(
    config: ConfigService<Env, true>,
    @Inject(API_CLIENT) private readonly api: ApiClient,
  ) {
    this.telegram = new Api(config.get('TELEGRAM_BOT_TOKEN', { infer: true }));
  }

  // A reply to the batch's first photo. Throws on a temporary failure (the job is retried by BullMQ).
  async send(batchId: string, replyTo: string): Promise<void> {
    const target = parseReplyTo(replyTo);
    if (!target) {
      this.logger.warn(`Batch ${batchId}: replyTo is not <chatId>:<messageId>, dropped`);
      return;
    }
    const summary = await this.load(batchId);
    if (!summary) return;
    await this.telegram.sendMessage(target.chatId, summary.text, {
      reply_markup: summary.buttons.length > 0 ? inlineKeyboard(summary.buttons) : undefined,
      reply_parameters: { message_id: target.messageId, allow_sending_without_reply: true },
    });
    this.logger.log(`Batch ${batchId}: summary sent to chat ${target.chatId}`);
  }

  // After a tap: the same message, re-rendered from the API (finished readings lose their buttons).
  async refresh(chatId: number, messageId: number, batchId: string): Promise<void> {
    const summary = await this.load(batchId);
    if (!summary) return;
    try {
      await this.telegram.editMessageText(chatId, messageId, summary.text, {
        reply_markup: inlineKeyboard(summary.buttons),
      });
    } catch (error) {
      // Same text and buttons as before (e.g. a refused tap): nothing to change.
      if (error instanceof GrammyError && error.description.includes('message is not modified'))
        return;
      throw error;
    }
  }

  // null = the batch is gone (its photos were deleted): nothing to show, no retry.
  private async load(batchId: string): Promise<RenderedSummary | null> {
    const { data, response } = await this.api.GET('/photo-batches/{batchId}', {
      params: { path: { batchId } },
    });
    if (response.status === 404) {
      this.logger.warn(`Batch ${batchId} not found`);
      return null;
    }
    if (!data) throw new Error(`GET /photo-batches/${batchId} failed: HTTP ${response.status}`);
    // Apartment buttons only for a photo no meter was found for.
    let apartments: { id: string; name: string }[] = [];
    if (data.photos.some((p) => p.parseStatus === 'NOT_MATCHED')) {
      const list = await this.api.GET('/apartments', { params: { query: { active: 'true' } } });
      if (!list.data) throw new Error(`GET /apartments failed: HTTP ${list.response.status}`);
      apartments = list.data;
    }
    return renderSummary(data, apartments);
  }
}
