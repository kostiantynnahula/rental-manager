import { Module } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service.js';

// No controller: keys are managed by the CLI (src/cli/api-keys.ts); the auth guard uses verify().
@Module({
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
