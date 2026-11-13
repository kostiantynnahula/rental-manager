import { Module } from '@nestjs/common';
import { ApiClientModule } from '../api/api-client.module.js';
import { IntakeService } from './intake.service.js';

// Photos → the API inbox. Used only by BotService.
@Module({
  imports: [ApiClientModule],
  providers: [IntakeService],
  exports: [IntakeService],
})
export class IntakeModule {}
