import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot } from 'grammy';
import { Env } from './config/env.validation.js';
import { allowlist } from './helpers/allowlist.middleware.js';
import { parseUserIds } from './helpers/parse-user-ids.js';
import { IntakeService } from './intake/intake.service.js';
import { COMMANDS, MESSAGES } from './messages.js';

// The bot's only entry point and its map: every input is wired here, features never call each other.
// Inputs: Telegram updates (below) and, next, BullMQ `bot-notifications` events (→ results/).
// Never log the token, the bot/api objects or `ctx` (they carry the token); grammY keeps it out of its own error
// messages while `sensitiveLogs` is off (the default).
@Injectable()
export class BotService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(BotService.name);
  private readonly bot: Bot;
  // bot.start(): resolves once polling has stopped and the last batch of updates was handled.
  private polling?: Promise<void>;

  constructor(
    config: ConfigService<Env, true>,
    private readonly intake: IntakeService,
  ) {
    this.bot = new Bot(config.get('TELEGRAM_BOT_TOKEN', { infer: true }));
    const allowed = parseUserIds(config.get('TELEGRAM_ALLOWED_USER_IDS', { infer: true }));

    // First: strangers get nothing, not even a reply.
    this.bot.use(allowlist(allowed, this.logger));
    this.bot.command('start', (ctx) => ctx.reply(MESSAGES.start));
    this.bot.command('help', (ctx) => ctx.reply(MESSAGES.help));
    // Photos and image files → intake (an album = one upload, one reply).
    this.bot.on(['message:photo', 'message:document'], (ctx) => this.intake.add(ctx));
    // Result buttons → results/ (next issue).

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
    // polls the same token): without polling the bot is useless, so shut down through SIGTERM — the Ctrl+C path
    // (enableShutdownHooks → onApplicationShutdown), so buffered photos are still uploaded. Exit code 143.
    this.polling = this.bot
      .start({ onStart: (me) => this.logger.log(`Polling as @${me.username}`) })
      .catch((error: unknown) => {
        const { name, message } = error instanceof Error ? error : new Error(String(error));
        this.logger.error(`Polling stopped: ${name}: ${message}`);
        process.kill(process.pid, 'SIGTERM');
      });
  }

  // Order matters: bot.stop() only aborts getUpdates; the current batch of updates is handled until start()
  // resolves. Only then can nothing call intake.add(), and the buffered photos are uploaded. One hook for all:
  // Nest runs hooks concurrently.
  async onApplicationShutdown(): Promise<void> {
    if (this.bot.isRunning()) await this.bot.stop();
    await this.polling;
    await this.intake.flush();
  }
}
