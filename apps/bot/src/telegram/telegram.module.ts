import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { botFromConfig, TELEGRAM_BOT } from './telegram-bot.js';

// One Bot per process: Nest modules are singletons, so every importer gets the same instance.
@Module({
  providers: [{ provide: TELEGRAM_BOT, inject: [ConfigService], useFactory: botFromConfig }],
  exports: [TELEGRAM_BOT],
})
export class TelegramModule {}
