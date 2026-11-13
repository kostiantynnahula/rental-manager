import type { RejectReason } from './reject-reason.interface.js';

export interface RejectedPhoto {
  // The file's name, or «фото N» (its position in the batch) for a compressed photo.
  name: string;
  reason: RejectReason;
}
