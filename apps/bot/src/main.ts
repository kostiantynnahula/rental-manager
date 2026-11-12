import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BotModule } from './bot.module.js';

// No HTTP server: an application context only runs the Telegram long polling.
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(BotModule);
  // Ctrl+C / SIGTERM: stop polling (TelegramBotService.onApplicationShutdown).
  app.enableShutdownHooks();
  new Logger('Bot').log('Started');
}
await bootstrap();
