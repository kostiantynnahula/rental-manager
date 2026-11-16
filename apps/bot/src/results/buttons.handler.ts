import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Context } from 'grammy';
import { API_CLIENT, type ApiClient } from '../api/api-client.js';
import { TAP_TEXTS } from '../messages.js';
import { apiErrorMessage } from './helpers/api-error-message.js';
import type { ButtonAction } from './interfaces/button-action.interface.js';
import type { TapOutcome } from './interfaces/tap-outcome.interface.js';
import { parseCallbackData } from './render/callback-data.js';
import { ResultsSender } from './results.sender.js';

// Telegram limits a callback answer to 200 characters.
const MAX_ANSWER = 200;

// A tap on a result button (after the allowlist: only the owner's tap makes the bot's key confirm anything).
// Stateless: everything comes from callback_data, so old buttons keep working after a restart. The API decides
// (its rules, its messages); the summary is then re-rendered from the API.
@Injectable()
export class ButtonsHandler {
  private readonly logger = new Logger(ButtonsHandler.name);

  constructor(
    @Inject(API_CLIENT) private readonly api: ApiClient,
    private readonly sender: ResultsSender,
  ) {}

  async handle(ctx: Context): Promise<void> {
    const query = ctx.callbackQuery;
    const message = query?.message;
    const action = query?.data ? parseCallbackData(query.data) : null;
    if (!action || !message) {
      await ctx.answerCallbackQuery({ text: TAP_TEXTS.stale, show_alert: true });
      return;
    }
    let outcome: TapOutcome;
    try {
      outcome = await this.run(action);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Button ${action.kind} failed: ${err.name}: ${err.message}`);
      outcome = { text: TAP_TEXTS.failed, alert: true, batchId: null };
    }
    // Always answered, once: otherwise Telegram shows the spinner on the button.
    await ctx.answerCallbackQuery({
      text: outcome.text.slice(0, MAX_ANSWER),
      show_alert: outcome.alert,
    });
    if (!outcome.batchId) return;
    try {
      await this.sender.refresh(message.chat.id, message.message_id, outcome.batchId);
    } catch (error) {
      // The action is done in the API; only the message is stale.
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Refresh of batch ${outcome.batchId} failed: ${err.name}: ${err.message}`);
    }
  }

  private async run(action: ButtonAction): Promise<TapOutcome> {
    switch (action.kind) {
      case 'confirm': {
        const { response, error } = await this.api.POST('/readings/{id}/confirm', {
          params: { path: { id: action.readingId } },
        });
        return this.outcome(response, error, TAP_TEXTS.confirmed, action.batchId);
      }
      case 'cancel': {
        const { response, error } = await this.api.POST('/readings/{id}/cancel', {
          params: { path: { id: action.readingId } },
          body: { reason: TAP_TEXTS.cancelReason },
        });
        return this.outcome(response, error, TAP_TEXTS.cancelled, action.batchId);
      }
      case 'confirm-batch': {
        const { data, response, error } = await this.api.POST('/photo-batches/{batchId}/confirm', {
          params: { path: { batchId: action.batchId } },
        });
        if (!data) return this.outcome(response, error, '', action.batchId);
        if (data.refused.length > 0) {
          return {
            text: TAP_TEXTS.refused(data.refused.map((r) => r.reason)),
            alert: true,
            batchId: action.batchId,
          };
        }
        return {
          text: TAP_TEXTS.batchConfirmed(data.confirmed.length),
          alert: false,
          batchId: action.batchId,
        };
      }
      case 'assign': {
        // The photo is parsed again; its batch notifies again when done (a new summary as a new reply).
        const { data, response, error } = await this.api.PATCH('/photos/{id}', {
          params: { path: { id: action.photoId } },
          body: { apartmentId: action.apartmentId },
        });
        if (!data) return this.outcome(response, error, '', null);
        return { text: TAP_TEXTS.reparsing, alert: false, batchId: data.batchId };
      }
    }
  }

  // 400/409/404: the API refused (its message, e.g. "Only DRAFT readings can be confirmed"); the summary is
  // re-rendered either way, so it shows the current state.
  private outcome(
    response: Response,
    error: unknown,
    success: string,
    batchId: string | null,
  ): TapOutcome {
    if (response.ok) return { text: success, alert: false, batchId };
    const message = apiErrorMessage(error);
    if ([400, 404, 409].includes(response.status) && message) {
      return { text: message, alert: true, batchId };
    }
    this.logger.error(
      `API refused a tap: HTTP ${response.status}${message ? ` (${message})` : ''}`,
    );
    return { text: TAP_TEXTS.failed, alert: true, batchId };
  }
}
