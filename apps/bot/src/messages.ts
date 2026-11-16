import type { components } from './api/schema.js';
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

// ---- Parse results (results/render) ----

type Schemas = components['schemas'];
type Utility = Schemas['UtilityType'];
type Zone = Schemas['Zone'];

// Ukrainian names, as in the web (apps/web/lib/utilities.ts). The bot can't import from the web.
export const UTILITY_NAMES: Record<Utility, string> = {
  ELECTRICITY: 'Електроенергія',
  COLD_WATER: 'Холодна вода',
  HOT_WATER: 'Гаряча вода',
  GAS: 'Газ',
};

export const UTILITY_ICONS: Record<Utility, string> = {
  ELECTRICITY: '⚡',
  COLD_WATER: '💧',
  HOT_WATER: '♨️',
  GAS: '🔥',
};

export const UTILITY_UNITS: Record<Utility, string> = {
  ELECTRICITY: 'кВт·год',
  COLD_WATER: 'м³',
  HOT_WATER: 'м³',
  GAS: 'м³',
};

export const ZONE_NAMES: Record<Zone, string> = {
  TOTAL: 'Показник',
  DAY: 'День',
  NIGHT: 'Ніч',
};

export const RESULT_TEXTS = {
  title: 'Результат розпізнавання:',
  archived: ' (в архіві)',
  confirmed: ' — ✅ підтверджено',
  cancelled: ' — ❌ скасовано',
  noPrevious: 'попереднього показання немає',
  lower: '⚠️ Менше за попереднє — підтвердити не вийде',
  missingZone: 'бракує — надішліть фото цієї зони',
  zeroConsumption: 'Нульове споживання, хоча є договір',
  allDone: 'Усе опрацьовано.',
  nothingFound: 'Показань не знайдено.',
  confirmAll: 'Підтвердити всі',
  truncated: '\n…',
} as const;

// "1520.350" (the API's decimal string) → "1520,350", as the web shows it.
export function decimalText(value: string): string {
  return value.replace('.', ',');
}

// Same wording as the web (apps/web/lib/consumption.ts `consumptionWarningText`).
export function aboveLimitText(
  utility: Utility,
  consumption: string,
  months: number,
  limit: number | null,
): string {
  const span = months > 1 ? ` за ${months} міс.` : '';
  // The API always sends the limit with ABOVE_LIMIT.
  return `Спожито ${decimalText(consumption)} ${UTILITY_UNITS[utility]}${span} — більше за звичні ${limit ?? '—'}/міс.`;
}

export function photoStatusText(
  position: number,
  status: Schemas['PhotoParseStatus'] | null,
  note: string | null,
): string | null {
  const name = `📷 ${photoName(position)}`;
  const why = note ? ` — ${note}` : '';
  if (status === 'NOT_MATCHED') return `${name}: лічильник не знайдено${why}. Оберіть квартиру:`;
  if (status === 'FAILED') return `${name}: помилка розпізнавання${why}`;
  if (status === 'PENDING') return `${name}: розпізнаю…`;
  return null;
}

export const BUTTON_TEXTS = {
  confirm: (meter: string) => `Підтвердити: ${meter}`,
  cancel: (meter: string) => `Скасувати: ${meter}`,
  assign: (position: number, apartment: string) => `${photoName(position)} → ${apartment}`,
} as const;

// Answers to a tap (toast, or an alert for a refusal).
export const TAP_TEXTS = {
  confirmed: 'Підтверджено ✅',
  cancelled: 'Скасовано ❌',
  batchConfirmed: (n: number) => (n > 0 ? `Підтверджено: ${n}` : 'Нічого підтверджувати'),
  refused: (reasons: string[]) => `Не підтверджено:\n${reasons.join('\n')}`,
  reparsing: 'Розпізнаю знову…',
  stale: 'Кнопка застаріла',
  failed: 'Не вдалося, спробуйте ще раз.',
  cancelReason: 'Скасовано в Telegram',
} as const;
