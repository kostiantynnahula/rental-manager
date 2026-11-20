import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ConfigService } from '@nestjs/config';
import { Env, ExtractionEffort, ExtractionProvider } from '../config/env.validation.js';
import { ExtractionNotConfiguredError } from '../extraction/errors/extraction-not-configured.error.js';

export interface ChatModelOptions {
  model: string;
  maxTokens: number;
  // Omitted → the model's default.
  effort?: ExtractionEffort;
}

// The worker's vision model (meter extraction, condition photo descriptions). Provider and key from env
// (EXTRACTION_PROVIDER, ANTHROPIC_API_KEY); throws ExtractionNotConfiguredError without a key, before building
// anything. No thinking/temperature: current models think adaptively by default; effort sets the depth.
export function chatModel(
  config: ConfigService<Env, true>,
  { model, maxTokens, effort }: ChatModelOptions,
): BaseChatModel {
  const provider = config.get('EXTRACTION_PROVIDER', { infer: true });
  switch (provider) {
    case ExtractionProvider.Anthropic: {
      const apiKey = config.get('ANTHROPIC_API_KEY', { infer: true });
      if (!apiKey) {
        throw new ExtractionNotConfiguredError(
          'ANTHROPIC_API_KEY is not set: the worker needs it for model calls',
        );
      }
      return new ChatAnthropic({
        model,
        apiKey,
        maxTokens,
        ...(effort && { outputConfig: { effort } }),
      });
    }
  }
}
