import type { InlineKeyboardMarkup } from 'grammy/types';
import type { SummaryButton } from '../interfaces/summary-button.interface.js';

// Rendered buttons → Telegram's markup. An empty keyboard removes the buttons of an edited message.
export function inlineKeyboard(buttons: SummaryButton[][]): InlineKeyboardMarkup {
  return {
    inline_keyboard: buttons.map((row) =>
      row.map((b) => ({ text: b.text, callback_data: b.data })),
    ),
  };
}
