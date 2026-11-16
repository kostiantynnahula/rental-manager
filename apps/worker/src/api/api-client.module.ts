import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { API_CLIENT, apiClientFromConfig } from './api-client.js';
import { WorkerApi } from './worker-api.service.js';

// Exports only WorkerApi: the raw openapi-fetch client (API_CLIENT) stays inside this module.
@Module({
  providers: [
    { provide: API_CLIENT, inject: [ConfigService], useFactory: apiClientFromConfig },
    WorkerApi,
  ],
  exports: [WorkerApi],
})
export class ApiClientModule {}
