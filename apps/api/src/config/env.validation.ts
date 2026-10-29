// Needed by class-transformer's implicit conversion; Nest loads it too, but this module must work standalone.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, Matches, Max, Min, validateSync } from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

// Every env var the api reads must be declared here (and in the root .env.example).
export class Env {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3001;

  @Matches(/^postgres(ql)?:\/\//, { message: 'DATABASE_URL must be a postgresql:// URL' })
  DATABASE_URL: string;
}

// Used by ConfigModule: fails fast at startup with all invalid vars listed.
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
