import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { API_CLIENT, apiClientFromConfig } from './api-client.js';

@Module({
  providers: [{ provide: API_CLIENT, inject: [ConfigService], useFactory: apiClientFromConfig }],
  exports: [API_CLIENT],
})
export class ApiClientModule {}
