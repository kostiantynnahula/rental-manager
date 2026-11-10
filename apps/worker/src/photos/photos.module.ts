import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PHOTO_QUEUE } from '@rental/shared';
import { ApiClientModule } from '../api/api-client.module.js';
import { ExtractionModule } from '../extraction/extraction.module.js';
import { ParsePhotoProcessor } from './parse-photo.processor.js';
import { ParsePhotoService } from './parse-photo.service.js';

// Feature module of the `photos` queue. The Redis connection comes from BullModule.forRootAsync
// in WorkerModule; the queue must be registered for @Processor(PHOTO_QUEUE) to start a worker.
@Module({
  imports: [BullModule.registerQueue({ name: PHOTO_QUEUE }), ApiClientModule, ExtractionModule],
  providers: [ParsePhotoProcessor, ParsePhotoService],
})
export class PhotosModule {}
