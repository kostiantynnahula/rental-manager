import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot } from 'grammy';
import { Env } from '../config/env.validation.js';
import { allowlist } from './helpers/allowlist.middleware.js';
import { parseUserIds } from './helpers/parse-user-ids.js';
import { COMMANDS, MESSAGES } from './messages.js';
import { PhotoIntakeService } from './photo-intake.service.js';

// Owns the grammY Bot: long polling from bootstrap to shutdown. Never log the token, the bot/api objects or
// `ctx` (they carry the token); grammY keeps it out of its own error messages (`sensitiveLogs` is off).
@Injectable()
export class TelegramBotService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly bot: Bot;

  constructor(config: ConfigService<Env, true>, intake: PhotoIntakeService) {
    this.bot = new Bot(config.get('TELEGRAM_BOT_TOKEN', { infer: true }));
    const allowed = parseUserIds(config.get('TELEGRAM_ALLOWED_USER_IDS', { infer: true }));

    this.bot.use(allowlist(allowed, this.logger));
    this.bot.command('start', (ctx) => ctx.reply(MESSAGES.start));
    this.bot.command('help', (ctx) => ctx.reply(MESSAGES.help));
    // Photos and image files → the inbox (batched: one reply per album).
    this.bot.on(['message:photo', 'message:document'], (ctx) => intake.add(ctx));

    // A failing handler: log it, tell the user, keep polling.
    this.bot.catch(async (err) => {
      const cause = err.error instanceof Error ? err.error : new Error(String(err.error));
      this.logger.error(
        `Update ${err.ctx.update.update_id} failed: ${cause.name}: ${cause.message}`,
      );
      try {
        await err.ctx.reply(MESSAGES.error);
      } catch {
        // The reply itself failed (e.g. network): already logged above, nothing more to do.
      }
    });
  }

  async onApplicationBootstrap(): Promise<void> {
    // getMe: a bad token fails startup here, with a clear error.
    await this.bot.init();
    await this.bot.api.setMyCommands(COMMANDS);
    // start() resolves only when polling stops, so it isn't awaited. It rejects e.g. on 409 (another process
    // polls the same token): without polling the app is useless, so exit.
    this.bot
      .start({
        onStart: (me) => this.logger.log(`Polling as @${me.username}`),
      })
      .catch((error: unknown) => {
        this.logger.error(`Polling stopped: ${(error as Error).message}`);
        process.exit(1);
      });
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.bot.isRunning()) await this.bot.stop();
  }
}
