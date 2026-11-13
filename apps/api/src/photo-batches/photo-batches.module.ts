import { Module } from '@nestjs/common';
import { ReadingsModule } from '../readings/readings.module.js';
import { PhotoBatchesController } from './photo-batches.controller.js';
import { PhotoBatchesService } from './photo-batches.service.js';

// Photos uploaded together (Photo.batchId): the summary for the Telegram bot.
@Module({
  imports: [ReadingsModule],
  controllers: [PhotoBatchesController],
  providers: [PhotoBatchesService],
})
export class PhotoBatchesModule {}
