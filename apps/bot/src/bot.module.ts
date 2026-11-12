import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configModuleOptions } from './config/config-module-options.js';
import { TelegramModule } from './telegram/telegram.module.js';

// Root: global config and the Telegram bot (which imports the API client for the photo intake).
@Module({
  imports: [ConfigModule.forRoot(configModuleOptions), TelegramModule],
})
export class BotModule {}
