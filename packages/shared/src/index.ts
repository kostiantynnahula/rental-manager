// Types and constants shared between apps/api and apps/web.
export const CURRENCY = 'UAH' as const;

export { normalizeUaPhone, phoneSearchDigits } from './phone.js';
export { PARSE_PHOTO_JOB, PHOTO_QUEUE, type ParsePhotoJobData } from './queues.js';
