import type { ReplyTarget } from '../interfaces/reply-target.interface.js';

// The intake's replyTo ("<chatId>:<messageId>", see intake.service.ts) → where the summary goes; null if malformed.
export function parseReplyTo(replyTo: string): ReplyTarget | null {
  const match = /^(-?\d+):(\d+)$/.exec(replyTo);
  return match ? { chatId: Number(match[1]), messageId: Number(match[2]) } : null;
}
