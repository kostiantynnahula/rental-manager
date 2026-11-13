import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BotService } from './bot.service.js';
import { configModuleOptions } from './config/config-module-options.js';
import { Env } from './config/env.validation.js';
import { IntakeModule } from './intake/intake.module.js';
import { bullmqOptionsFromConfig } from './queue/bullmq.config.js';
import { ResultsModule } from './results/results.module.js';

// Root: global config and Redis (only for the bot-notifications consumer), the features, and BotService — the one
// entry point that wires them to Telegram.
@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => bullmqOptionsFromConfig(config),
    }),
    IntakeModule,
    ResultsModule,
  ],
  providers: [BotService],
})
export class BotModule {}
