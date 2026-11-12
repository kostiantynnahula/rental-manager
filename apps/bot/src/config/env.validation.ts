// Needed by class-transformer's implicit conversion; Nest loads it too, but this module must work standalone.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, Matches, Max, Min, validateSync } from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

// Every env var the bot reads must be declared here (and in the root .env.example).
// Messages must never echo a value: the token and the key are secrets.
export class Env {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  // From BotFather. It is part of every Bot API URL: never log it.
  @Matches(/^\d+:[\w-]+$/, { message: 'TELEGRAM_BOT_TOKEN must be a bot token (<id>:<secret>)' })
  TELEGRAM_BOT_TOKEN: string;

  // Telegram user ids allowed to use the bot, comma-separated; everyone else is ignored.
  @Matches(/^\s*\d+(\s*,\s*\d+)*\s*$/, {
    message: 'TELEGRAM_ALLOWED_USER_IDS must be comma-separated Telegram user ids',
  })
  TELEGRAM_ALLOWED_USER_IDS: string;

  // The API's upload limit (same name and default as in apps/api, so the shared root .env sets both): bigger
  // photos are answered "too large" without downloading them.
  @IsInt()
  @Min(1)
  @Max(100)
  PHOTO_MAX_FILE_SIZE_MB: number = 15;

  // Includes the global prefix, e.g. http://localhost:3001/api (OpenAPI paths have no /api).
  @Matches(/^https?:\/\//, { message: 'API_BASE_URL must be an http(s):// URL' })
  API_BASE_URL: string;

  // API key of the bot's service user (`pnpm --filter api apikey:create --service telegram-bot ...`). Never log it.
  @Matches(/^rm_/, { message: 'BOT_API_KEY must be an API key (rm_…)' })
  BOT_API_KEY: string;
}

// Used by ConfigModule: fails fast at startup with all invalid vars listed (names and rules, never values).
export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, { enableImplicitConversion: true });
  const errors = validateSync(env);
  if (errors.length > 0) {
    const details = errors
      .map((e) => `  ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${details}`);
  }
  return env;
}
