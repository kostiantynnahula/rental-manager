import type { IntakeResult } from './intake/interfaces/intake-result.interface.js';
import type { RejectReason } from './intake/interfaces/reject-reason.interface.js';

// Every user-facing text of the bot (Ukrainian, plain text — no parse_mode).
export const MESSAGES = {
  start:
    'Вітаю! Я бот Rental Manager.\nНадішліть фото або альбом фото лічильників — я завантажу їх і розпізнаю показання. /help — довідка.',
  help: 'Надішліть фото або альбом лічильників (можна файлом — тоді в оригінальній якості).\n\nКоманди:\n/start — привітання\n/help — ця довідка',
  notAnImage: 'Надішліть фото лічильника (зображення).',
  error: 'Щось пішло не так, спробуйте ще раз.',
} as const;

export const COMMANDS = [
  { command: 'start', description: 'Привітання' },
  { command: 'help', description: 'Довідка' },
];

// A compressed photo has no name: its position in the batch.
export function photoName(position: number): string {
  return `фото ${position}`;
}

const REJECT_REASONS: Record<RejectReason, string> = {
  unsupported: 'формат не підтримується або файл пошкоджений (лише JPEG, PNG, WebP)',
  'too-large': 'завелике',
  'download-failed': 'не вдалося отримати з Telegram, надішліть ще раз',
  unauthorized: 'бот не має доступу до API (перевірте BOT_API_KEY)',
  failed: 'не вдалося завантажити, надішліть ще раз',
};

// The one reply to a batch. «фото» doesn't change with the number.
export function intakeReply({ accepted, duplicates, rejected }: IntakeResult): string {
  const lines: string[] = [];
  if (accepted > 0) lines.push(`Прийнято ${accepted} фото, розпізнаю…`);
  if (duplicates > 0) lines.push(`${duplicates} фото вже отримано раніше.`);
  for (const r of rejected) lines.push(`${r.name}: ${REJECT_REASONS[r.reason]}`);
  return lines.join('\n') || MESSAGES.error;
}
