import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BotModule } from './bot.module.js';


try {
  const app = await NestFactory.createApplicationContext(BotModule);
  app.enableShutdownHooks();
  new Logger('Bot').log('Started');
} catch (error) {
  // Name + message only, never the error object: a grammY HttpError's cause (`.error`, the node-fetch error)
  // holds the Bot API URL, which contains the token — Node would print it for an unhandled rejection.
  const { name, message } = error instanceof Error ? error : new Error(String(error));
  new Logger('Bot').error(`Startup failed: ${name}: ${message}`);
  process.exit(1);
}
