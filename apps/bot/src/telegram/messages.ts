// Bot replies (Ukrainian, plain text).
export const MESSAGES = {
  start:
    'Вітаю! Я бот Rental Manager.\nНезабаром сюди можна буде надсилати фото лічильників. /help — довідка.',
  help: 'Команди:\n/start — привітання\n/help — ця довідка',
  error: 'Щось пішло не так, спробуйте ще раз.',
} as const;

export const COMMANDS = [
  { command: 'start', description: 'Привітання' },
  { command: 'help', description: 'Довідка' },
];
