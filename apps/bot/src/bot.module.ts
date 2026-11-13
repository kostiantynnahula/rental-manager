import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BotService } from './bot.service.js';
import { configModuleOptions } from './config/config-module-options.js';
import { IntakeModule } from './intake/intake.module.js';

// Root: global config, the features, and BotService — the one entry point that wires them to Telegram.
@Module({
  imports: [ConfigModule.forRoot(configModuleOptions), IntakeModule],
  providers: [BotService],
})
export class BotModule {}
