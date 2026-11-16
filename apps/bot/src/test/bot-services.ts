import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { fakeApi, type Routes } from '@rental/testing';
import { onTestFinished, vi } from 'vitest';
import type { paths } from '../api/schema.js';
import { BotService } from '../bot.service.js';
import type { Env } from '../config/env.validation.js';
import { IntakeService } from '../intake/intake.service.js';
import { ButtonsHandler } from '../results/buttons.handler.js';
import { NotificationsConsumer } from '../results/notifications.consumer.js';
import { ResultsSender } from '../results/results.sender.js';
import { CHAT_ID, fakeTelegram, type FakeTelegramOptions } from './fake-telegram.js';

export interface BotServicesOptions {
  routes?: Routes;
  telegram?: FakeTelegramOptions;
  // PHOTO_MAX_FILE_SIZE_MB (default 15, as the env default).
  maxFileSizeMb?: number;
  // TELEGRAM_ALLOWED_USER_IDS (default: the owner, CHAT_ID).
  allowedUserIds?: string;
}

// The one place that builds the bot's services (plain `new`, no Nest container): a constructor change touches only
// this file. One fake API, one fake Telegram (the Bot of TELEGRAM_BOT). Nest's Logger is silenced; the spies are
// returned for assertions. BotService registers its handlers on `telegram.bot` — deliver updates with
// `telegram.bot.handleUpdates([...])` (the polling path, so bot.catch runs).
export function botServices({
  routes = {},
  telegram,
  maxFileSizeMb = 15,
  allowedUserIds = String(CHAT_ID),
}: BotServicesOptions = {}) {
  const { api, requests } = fakeApi<paths>(routes);
  const tg = fakeTelegram(telegram);
  const values: Partial<Record<keyof Env, unknown>> = {
    PHOTO_MAX_FILE_SIZE_MB: maxFileSizeMb,
    TELEGRAM_ALLOWED_USER_IDS: allowedUserIds,
  };
  const config = {
    get: (key: keyof Env) => {
      if (!(key in values)) throw new Error(`botServices: no config value for ${key}`);
      return values[key];
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

  const intake = new IntakeService(config, api);
  const sender = new ResultsSender(tg.bot, api);
  const buttons = new ButtonsHandler(api, sender);
  const consumer = new NotificationsConsumer(sender);
  const botService = new BotService(config, tg.bot, intake, buttons);
  return { intake, sender, buttons, consumer, botService, requests, telegram: tg, logs };
}
