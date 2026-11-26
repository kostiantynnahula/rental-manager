import { BadRequestException } from '@nestjs/common';
import { CHAT_MESSAGE_MAX_LENGTH } from '../constants/chat-agent.js';

// The question's text (its parts joined), 1–CHAT_MESSAGE_MAX_LENGTH chars once trimmed.
export function questionText(parts: { text: string }[]): string {
  const text = parts
    .map((p) => p.text)
    .join('')
    .trim();
  if (!text) throw new BadRequestException('message must have text');
  if (text.length > CHAT_MESSAGE_MAX_LENGTH) {
    throw new BadRequestException(`message must be at most ${CHAT_MESSAGE_MAX_LENGTH} characters`);
  }
  return text;
}
