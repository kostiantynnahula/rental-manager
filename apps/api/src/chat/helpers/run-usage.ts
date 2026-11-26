import { AIMessage, type BaseMessage } from '@langchain/core/messages';

// Tokens of this run's model calls (from the final graph state). History messages carry no usage, so they add 0.
export function runUsage(messages: readonly BaseMessage[] | undefined): {
  inputTokens: number;
  outputTokens: number;
} {
  let inputTokens = 0;
  let outputTokens = 0;
  for (const message of messages ?? []) {
    if (!AIMessage.isInstance(message) || !message.usage_metadata) continue;
    inputTokens += message.usage_metadata.input_tokens;
    outputTokens += message.usage_metadata.output_tokens;
  }
  return { inputTokens, outputTokens };
}
