// An attachment is current when it hasn't ended before `period` (one that starts later counts too:
// it's planned, not finished). Same rule as currentAttachmentWhere() in SQL.
export function isAttachmentCurrent(attachment: { activeTo: Date | null }, period: Date): boolean {
  return attachment.activeTo === null || attachment.activeTo >= period;
}
