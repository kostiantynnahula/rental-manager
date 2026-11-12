// How one photo's upload to the inbox ended; the bot's reply counts these.
export type UploadOutcome =
  'accepted' | 'duplicate' | 'unsupported' | 'too-large' | 'unauthorized' | 'failed';
