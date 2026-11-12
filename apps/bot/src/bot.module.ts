import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiClientModule } from './api/api-client.module.js';
import { configModuleOptions } from './config/config-module-options.js';
import { TelegramModule } from './telegram/telegram.module.js';

// Root: global config, the API client (used by the photo features, #62+) and the Telegram bot.
@Module({
  imports: [ConfigModule.forRoot(configModuleOptions), ApiClientModule, TelegramModule],
})
export class BotModule {}
