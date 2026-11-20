import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { ApartmentsModule } from '../apartments/apartments.module.js';
import { Env } from '../config/env.validation.js';
import { multerOptionsFromConfig } from '../images/config/upload.config.js';
import { QueueModule } from '../queue/queue.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { ApartmentConditionPhotosController } from './apartment-condition-photos.controller.js';
import { ConditionPhotosController } from './condition-photos.controller.js';
import { ConditionPhotosService } from './condition-photos.service.js';

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
  controllers: [ApartmentConditionPhotosController, ConditionPhotosController],
  providers: [ConditionPhotosService],
})
export class ConditionPhotosModule {}
