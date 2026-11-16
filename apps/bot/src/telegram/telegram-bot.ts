import { ConfigService } from '@nestjs/config';
import { Bot } from 'grammy';
import { Env } from '../config/env.validation.js';

export const TELEGRAM_BOT = Symbol('TELEGRAM_BOT');

// The one Telegram client of the process: BotService registers its handlers on it (and they reach Telegram via
// `ctx.api` = `bot.api`), ResultsSender sends through `bot.api`. Nothing else creates a Bot or an Api, so a test
// can provide a Bot with a fake transport (`bot.api.config.use`). The token is inside it: never log it.
export function botFromConfig(config: ConfigService<Env, true>): Bot {
  return new Bot(config.get('TELEGRAM_BOT_TOKEN', { infer: true }));
}
