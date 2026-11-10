// Types and constants shared between apps/api and apps/web.
export const CURRENCY = 'UAH' as const;

export {
  CONSUMPTION_LIMITS,
  CONSUMPTION_WARNINGS,
  consumptionLimit,
  consumptionWarnings,
  type ConsumptionInput,
  type ConsumptionWarning,
  type MeterZone,
  type Utility,
} from './consumption.js';
export { fromThousandths, toThousandths } from './decimal.js';
export { normalizeUaPhone, phoneSearchDigits } from './phone.js';
export { PARSE_PHOTO_JOB, PHOTO_QUEUE, type ParsePhotoJobData } from './queues.js';
