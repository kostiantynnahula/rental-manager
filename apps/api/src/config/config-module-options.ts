import type { ConfigModuleOptions } from '@nestjs/config';
import { validateEnv } from './env.validation.js';

// Shared by AppModule and the CLI, so both load and validate env the same way.
export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  cache: true,
  // cwd is apps/api: an optional local .env wins over the shared root .env.
  envFilePath: ['.env', '../../.env'],
  validate: validateEnv,
};
