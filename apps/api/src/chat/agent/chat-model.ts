import { ChatAnthropic } from '@langchain/anthropic';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation.js';

// The chat agent's model (CHAT_MODEL). null without ANTHROPIC_API_KEY: the route then answers 503 before saving.
// No temperature/thinking: current models think adaptively by default.
export function chatModel(config: ConfigService<Env, true>): ChatAnthropic | null {
  const apiKey = config.get('ANTHROPIC_API_KEY', { infer: true });
  if (!apiKey) return null;
  return new ChatAnthropic({
    model: config.get('CHAT_MODEL', { infer: true }),
    apiKey,
    maxTokens: 2048,
  });
}
