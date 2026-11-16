import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { fakeApi, type Routes } from '@rental/testing';
import { onTestFinished, vi } from 'vitest';
import type { paths } from '../api/schema.js';
import type { Env } from '../config/env.validation.js';
import { IntakeService } from '../intake/intake.service.js';
import { fakeTelegram, type FakeTelegramOptions } from './fake-telegram.js';

export interface IntakeServiceOptions {
  routes?: Routes;
  telegram?: FakeTelegramOptions;
  // PHOTO_MAX_FILE_SIZE_MB (default 15, as the env default).
  maxFileSizeMb?: number;
}

// The one place that builds IntakeService (plain `new`, no Nest container): a constructor change touches only this
// file. Nest's Logger is silenced; the spies are returned for assertions.
export function intakeService({
  routes = {},
  telegram,
  maxFileSizeMb = 15,
}: IntakeServiceOptions = {}) {
  const { api, requests } = fakeApi<paths>(routes);
  const tg = fakeTelegram(telegram);
  const config = {
    get: (key: keyof Env) => {
      if (key === 'PHOTO_MAX_FILE_SIZE_MB') return maxFileSizeMb;
      throw new Error(`intakeService: no config value for ${key}`);
    },
  } as unknown as ConfigService<Env, true>;

  const logs = {
    log: vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {}),
    warn: vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {}),
  };
  onTestFinished(() => {
    logs.log.mockRestore();
    logs.warn.mockRestore();
    logs.error.mockRestore();
  });

  return { intake: new IntakeService(config, api), requests, telegram: tg, logs };
}
