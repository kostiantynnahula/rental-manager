import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { ApartmentsModule } from '../apartments/apartments.module.js';
import { Env } from '../config/env.validation.js';
import { QueueModule } from '../queue/queue.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { ApartmentPhotosController } from './apartment-photos.controller.js';
import { multerOptionsFromConfig } from './config/upload.config.js';
import { PhotosController } from './photos.controller.js';
import { PhotosService } from './photos.service.js';

@Module({
  imports: [
    ApartmentsModule,
    StorageModule,
    QueueModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => multerOptionsFromConfig(config),
    }),
  ],
  controllers: [ApartmentPhotosController, PhotosController],
  providers: [PhotosService],
  exports: [PhotosService],
})
export class PhotosModule {}
