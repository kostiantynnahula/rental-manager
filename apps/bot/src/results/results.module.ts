import { Module } from '@nestjs/common';
import { ApiClientModule } from '../api/api-client.module.js';
import { ParseWatcherService } from './parse-watcher.service.js';
import { ResultActionsService } from './result-actions.service.js';
import { ResultsApiService } from './results-api.service.js';
import { ResultsStateService } from './results-state.service.js';
import { SummaryService } from './summary.service.js';

// Parse results in Telegram: wait for the worker, show a summary, handle the confirm/cancel/assign buttons.
@Module({
  imports: [ApiClientModule],
  providers: [
    ResultsApiService,
    ResultsStateService,
    SummaryService,
    ParseWatcherService,
    ResultActionsService,
  ],
  exports: [ParseWatcherService, ResultActionsService],
})
export class ResultsModule {}
