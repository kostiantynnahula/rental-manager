// BullMQ contracts: apps/api → apps/worker (photo jobs) and apps/api → apps/bot (notifications). Not part of the
// HTTP API.

// Queue for photo processing jobs.
export const PHOTO_QUEUE = 'photos';

// Extract meter values from a photo. On upload jobId = photoId, so an upload is never queued twice; a re-parse
// (e.g. after an apartment was assigned to an inbox photo) gets its own jobId. The worker reads data.photoId only.
export const PARSE_PHOTO_JOB = 'parse-photo';

export interface ParsePhotoJobData {
  photoId: string;
}

// One queue for every api → bot event; the event type is the job name. Events are a signal only: the bot always
// loads fresh data from the API.
export const BOT_NOTIFICATIONS_QUEUE = 'bot-notifications';

// No photo of a batch is PENDING any more (each is PARSED, NOT_MATCHED or FAILED), and the batch has a replyTo.
// jobId = batch-parsed-<batchId>: no duplicate while one is queued; a later re-parse can notify again.
export const BATCH_PARSED_JOB = 'batch-parsed';

export interface BatchParsedJobData {
  batchId: string;
  // Opaque, as the client sent it on upload (the bot: chatId:messageId).
  replyTo: string;
}
