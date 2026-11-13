import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BotModule } from './bot.module.js';

// No HTTP server: an application context only runs the Telegram long polling.
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(BotModule);
  // Ctrl+C / SIGTERM: stop polling, upload buffered photos (BotService.onApplicationShutdown).
  app.enableShutdownHooks();
  new Logger('Bot').log('Started');
}
try {
  await bootstrap();
} catch (error) {
  // Name + message only, never the error object: a grammY HttpError's cause (`.error`, the node-fetch error)
  // holds the Bot API URL, which contains the token — Node would print it for an unhandled rejection.
  const { name, message } = error instanceof Error ? error : new Error(String(error));
  new Logger('Bot').error(`Startup failed: ${name}: ${message}`);
  process.exit(1);
}
