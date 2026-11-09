// BullMQ contract between apps/api (producer) and apps/worker (consumer). Not part of the HTTP API.

// Queue for photo processing jobs.
export const PHOTO_QUEUE = 'photos';

// Extract meter values from a newly uploaded photo. jobId = photoId, so a photo is never queued twice.
export const PARSE_PHOTO_JOB = 'parse-photo';

export interface ParsePhotoJobData {
  photoId: string;
}
