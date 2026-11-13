import type { RejectedPhoto } from './rejected-photo.interface.js';

// How a batch's upload ended: the bot's one reply to it (messages.ts `intakeReply`).
export interface IntakeResult {
  // Newly stored by the API (they get one batchId and are parsed).
  accepted: number;
  // Already uploaded before (sha256): the API returned the existing records.
  duplicates: number;
  rejected: RejectedPhoto[];
}
