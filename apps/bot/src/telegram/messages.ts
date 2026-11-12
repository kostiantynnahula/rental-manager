import type { UploadOutcome } from '../photos/upload-outcome.js';

// Bot replies (Ukrainian, plain text).
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

// One reply per batch, a line per kind of outcome. «фото» doesn't change with the number.
export function batchReply(outcomes: readonly UploadOutcome[]): string {
  const count = (o: UploadOutcome) => outcomes.filter((x) => x === o).length;
  const lines: [number, string][] = [
    [count('accepted'), 'Прийнято N фото, розпізнаю…'],
    [count('duplicate'), 'N фото вже були завантажені раніше.'],
    [count('unsupported'), 'N фото: формат не підтримується (лише JPEG, PNG, WebP).'],
    [count('too-large'), 'N фото завеликі.'],
    [
      count('unauthorized'),
      'N фото не завантажено: бот не має доступу до API (перевірте BOT_API_KEY).',
    ],
    [count('failed'), 'N фото не вдалося завантажити, спробуйте ще раз.'],
  ];
  return lines
    .filter(([n]) => n > 0)
    .map(([n, text]) => text.replace('N', String(n)))
    .join('\n');
}
