import { Module } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service.js';

@Module({
  providers: [TelegramBotService],
})
export class TelegramModule {}
