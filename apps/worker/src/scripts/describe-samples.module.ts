import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConditionPhotoDescriber } from '../condition-photos/condition-photo-describer.service.js';
import { configModuleOptions } from '../config/config-module-options.js';

// Slim context for scripts/describe-samples.ts: config + the describer only. Not ConditionPhotosModule: that one
// registers the queue (Redis) and the API client.
@Module({
  imports: [ConfigModule.forRoot(configModuleOptions)],
  providers: [ConditionPhotoDescriber],
})
export class DescribeSamplesModule {}
