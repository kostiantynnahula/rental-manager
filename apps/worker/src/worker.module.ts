import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configModuleOptions } from './config/config-module-options.js';
import { Env } from './config/env.validation.js';
import { PhotosModule } from './photos/photos.module.js';
import { bullmqOptionsFromConfig } from './queue/bullmq.config.js';

// Root: global infra (config, Redis connection) + one feature module per queue.
@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => bullmqOptionsFromConfig(config),
    }),
    PhotosModule,
  ],
})
export class WorkerModule {}
