// How one photo's upload to the inbox ended; the bot's reply counts these.
export type UploadOutcome =
  'accepted' | 'duplicate' | 'unsupported' | 'too-large' | 'unauthorized' | 'failed';

// The outcome plus the photo's id when the API has it (accepted / duplicate): the bot then waits for its parse.
export interface UploadResult {
  outcome: UploadOutcome;
  photoId?: string;
}
