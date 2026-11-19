import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BOT_NOTIFICATIONS_QUEUE, CONDITION_PHOTO_QUEUE, PHOTO_QUEUE } from '@rental/shared';
import { Env } from '../config/env.validation.js';
import { BotNotificationsService } from './bot-notifications.service.js';
import { bullmqOptionsFromConfig } from './config/bullmq.config.js';
import { ConditionPhotoJobsService } from './condition-photo-jobs.service.js';
import { PhotoJobsService } from './photo-jobs.service.js';

// The API only enqueues jobs; apps/worker (photos, condition-photos) and apps/bot (bot-notifications) consume them
// (queue names/payloads: @rental/shared).
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => bullmqOptionsFromConfig(config),
    }),
    BullModule.registerQueue(
      { name: PHOTO_QUEUE },
      { name: CONDITION_PHOTO_QUEUE },
      { name: BOT_NOTIFICATIONS_QUEUE },
    ),
  ],
  providers: [PhotoJobsService, ConditionPhotoJobsService, BotNotificationsService],
  exports: [PhotoJobsService, ConditionPhotoJobsService, BotNotificationsService],
})
export class QueueModule {}
