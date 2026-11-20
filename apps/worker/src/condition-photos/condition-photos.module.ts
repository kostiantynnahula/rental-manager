import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CONDITION_PHOTO_QUEUE } from '@rental/shared';
import { ApiClientModule } from '../api/api-client.module.js';
import { ConditionDescriptionReporter } from './condition-description-reporter.service.js';
import { ConditionPhotoDescriber } from './condition-photo-describer.service.js';
import { DescribeConditionPhotoProcessor } from './describe-condition-photo.processor.js';
import { DescribeConditionPhotoService } from './describe-condition-photo.service.js';

// Feature module of the `condition-photos` queue (the Redis connection comes from WorkerModule). Needs the global
// ConfigModule (the describer's model).
@Module({
  imports: [BullModule.registerQueue({ name: CONDITION_PHOTO_QUEUE }), ApiClientModule],
  providers: [
    DescribeConditionPhotoProcessor,
    DescribeConditionPhotoService,
    ConditionDescriptionReporter,
    ConditionPhotoDescriber,
  ],
})
export class ConditionPhotosModule {}
