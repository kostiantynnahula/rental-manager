import { Injectable, Logger } from '@nestjs/common';
import { type Context, GrammyError, InlineKeyboard } from 'grammy';
import type { InlineKeyboardButton, Message } from 'grammy/types';
import { ApiCallError } from './helpers/api-call-error.js';
import type { ResultAction } from './interfaces/result-action.interface.js';
import { ParseWatcherService } from './parse-watcher.service.js';
import { ResultsApiService } from './results-api.service.js';
import { ResultsStateService } from './results-state.service.js';
import { SummaryService } from './summary.service.js';

// Telegram shows at most 200 characters in a callback answer.
const ANSWER_MAX = 200;

// A tap on a result button (after the allowlist, like every handler): the owner's action, so the bot's key may
// confirm/cancel on their behalf. The message is then edited (✅ / ❌, finished drafts lose their buttons), so a
// button can't be tapped twice; API refusals (e.g. a value lower than the previous one) are shown as text.
@Injectable()
export class ResultActionsService {
  private readonly logger = new Logger(ResultActionsService.name);

  constructor(
    private readonly api: ResultsApiService,
    private readonly summary: SummaryService,
    private readonly state: ResultsStateService,
    private readonly watcher: ParseWatcherService,
  ) {}

  async handle(ctx: Context): Promise<void> {
    const data = ctx.callbackQuery?.data;
    const message = ctx.callbackQuery?.message;
    if (!data || !message || !('text' in message)) {
      await ctx.answerCallbackQuery();
      return;
    }
    const action = this.state.action(data);
    if (!action) {
      await ctx.answerCallbackQuery({
        text: 'Кнопка застаріла — підтвердіть по одному або надішліть фото ще раз.',
        show_alert: true,
      });
      return;
    }
    this.state.forget(data);
    try {
      if (action.kind === 'assign') {
        await this.assign(ctx, message, action);
      } else {
        await this.decide(ctx, message, data, action);
      }
    } catch (error) {
      const { name, message: text } = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Button ${action.kind} failed: ${name}: ${text}`);
      await ctx.answerCallbackQuery({ text: 'Щось пішло не так, спробуйте ще раз.' });
    }
  }

  // confirm / cancel / confirm-all
  private async decide(
    ctx: Context,
    message: Message,
    data: string,
    action: Exclude<ResultAction, { kind: 'assign' }>,
  ): Promise<void> {
    const ids = action.kind === 'confirm-all' ? action.readingIds : [action.readingId];
    const cancel = action.kind === 'cancel';
    const errors: string[] = [];
    for (const id of ids) {
      try {
        await (cancel ? this.api.cancel(id) : this.api.confirm(id));
      } catch (error) {
        if (!(error instanceof ApiCallError)) throw error;
        errors.push(
          `${cancel ? 'Не вдалося скасувати' : 'Не вдалося підтвердити'}: ${refusal(error)}`,
        );
      }
    }
    const done = ids.length - errors.length;
    const answer =
      errors.length > 0
        ? errors.join('\n')
        : cancel
          ? '❌ Скасовано'
          : done > 1
            ? `✅ Підтверджено: ${done}`
            : '✅ Підтверджено';
    await this.refresh(ctx, message, data, errors.length > 0 ? errors : [answer]);
    await ctx.answerCallbackQuery({
      text: answer.slice(0, ANSWER_MAX),
      show_alert: errors.length > 0,
    });
  }

  private async assign(
    ctx: Context,
    message: Message,
    action: Extract<ResultAction, { kind: 'assign' }>,
  ): Promise<void> {
    try {
      await this.api.assign(action.photoId, action.apartmentId);
    } catch (error) {
      if (!(error instanceof ApiCallError)) throw error;
      const text = `Не вдалося призначити квартиру: ${refusal(error)}`;
      await this.edit(ctx, `${message.text ?? ''}\n\n${text}`, new InlineKeyboard());
      await ctx.answerCallbackQuery({ text: text.slice(0, ANSWER_MAX), show_alert: true });
      return;
    }
    await this.edit(ctx, `Квартира: ${action.apartmentName} — розпізнаю…`, new InlineKeyboard());
    await ctx.answerCallbackQuery({ text: `Квартира: ${action.apartmentName}` });
    // Re-parsed against that apartment's meters: wait again, a new summary follows. Replies go to the photo.
    const chatId = message.chat.id;
    const photoMessageId = message.reply_to_message?.message_id ?? message.message_id;
    this.watcher.watch(ctx.api, chatId, [{ photoId: action.photoId, messageId: photoMessageId }]);
  }

  // Re-render the summary from the API (statuses, remaining buttons) + the result lines. Without the summary's
  // state (restart / expired), drop the tapped reading's row and append the result to the old text instead.
  private async refresh(
    ctx: Context,
    message: Message,
    data: string,
    resultLines: string[],
  ): Promise<void> {
    const tail = `\n\n${resultLines.join('\n')}`;
    const photoIds = this.state.summaryPhotos(message.chat.id, message.message_id);
    if (photoIds) {
      const fresh = await this.summary.buildForIds(photoIds);
      await this.edit(ctx, fresh.text + tail, fresh.keyboard ?? new InlineKeyboard());
      return;
    }
    const readingId = data.slice(data.indexOf(':') + 1);
    const rows = (message.reply_markup?.inline_keyboard ?? []).filter(
      (row) => !row.some((b) => callbackOf(b)?.endsWith(readingId)),
    );
    await this.edit(ctx, (message.text ?? '') + tail, new InlineKeyboard(rows));
  }

  private async edit(ctx: Context, text: string, keyboard: InlineKeyboard): Promise<void> {
    try {
      await ctx.editMessageText(text, { reply_markup: keyboard });
    } catch (error) {
      // Same text and buttons as before: nothing to change.
      if (error instanceof GrammyError && error.description.includes('message is not modified')) {
        return;
      }
      throw error;
    }
  }
}

function callbackOf(button: InlineKeyboardButton): string | undefined {
  return 'callback_data' in button ? button.callback_data : undefined;
}

// The API's message (English, e.g. "Value is lower than the previous reading"), else the status.
function refusal(error: ApiCallError): string {
  return error.apiMessage || `HTTP ${error.status}`;
}
