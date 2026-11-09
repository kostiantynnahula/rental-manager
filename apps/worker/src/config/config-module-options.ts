import type { ConfigModuleOptions } from '@nestjs/config';
import { validateEnv } from './env.validation.js';

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  cache: true,
  // cwd is apps/worker: an optional local .env wins over the shared root .env.
  envFilePath: ['.env', '../../.env'],
  validate: validateEnv,
};
