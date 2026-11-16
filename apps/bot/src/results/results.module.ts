import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BOT_NOTIFICATIONS_QUEUE } from '@rental/shared';
import { ApiClientModule } from '../api/api-client.module.js';
import { ButtonsHandler } from './buttons.handler.js';
import { NotificationsConsumer } from './notifications.consumer.js';
import { ResultsSender } from './results.sender.js';

// Parse results: the batch-parsed event → summary, and the buttons on it. The queue must be registered for
// @Processor to start a worker (the Redis connection comes from BotModule).
@Module({
  imports: [BullModule.registerQueue({ name: BOT_NOTIFICATIONS_QUEUE }), ApiClientModule],
  providers: [NotificationsConsumer, ResultsSender, ButtonsHandler],
  exports: [ButtonsHandler],
})
export class ResultsModule {}
