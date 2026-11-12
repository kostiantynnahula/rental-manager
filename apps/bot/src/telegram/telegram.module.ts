import { Module } from '@nestjs/common';
import { ApiClientModule } from '../api/api-client.module.js';
import { PhotoUploaderService } from '../photos/photo-uploader.service.js';
import { PhotoIntakeService } from './photo-intake.service.js';
import { TelegramBotService } from './telegram-bot.service.js';

@Module({
  imports: [ApiClientModule],
  providers: [TelegramBotService, PhotoIntakeService, PhotoUploaderService],
})
export class TelegramModule {}
