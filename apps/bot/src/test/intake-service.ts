import { botServices, type BotServicesOptions } from './bot-services.js';

export type IntakeServiceOptions = Omit<BotServicesOptions, 'allowedUserIds'>;

// IntakeService alone (built by botServices — the one place that `new`s the services).
export function intakeService(options: IntakeServiceOptions = {}) {
  const { intake, requests, telegram, logs } = botServices(options);
  return { intake, requests, telegram, logs };
}
