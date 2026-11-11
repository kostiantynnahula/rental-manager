// BullMQ contract between apps/api (producer) and apps/worker (consumer). Not part of the HTTP API.

// Queue for photo processing jobs.
export const PHOTO_QUEUE = 'photos';

// Extract meter values from a photo. On upload jobId = photoId, so an upload is never queued twice; a re-parse
// (e.g. after an apartment was assigned to an inbox photo) gets its own jobId. The worker reads data.photoId only.
export const PARSE_PHOTO_JOB = 'parse-photo';

export interface ParsePhotoJobData {
  photoId: string;
}
