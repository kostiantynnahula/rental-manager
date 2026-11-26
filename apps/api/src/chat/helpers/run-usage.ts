import { AIMessage } from '@langchain/core/messages';
import type { LLMResult } from '@langchain/core/outputs';

// Tokens of one model call (a callback's handleLLMEnd): counted per call, so a failed or aborted run still logs
// what it spent.
export function llmResultUsage(result: LLMResult): { inputTokens: number; outputTokens: number } {
  let inputTokens = 0;
  let outputTokens = 0;
  for (const generation of result.generations.flat()) {
    const message = 'message' in generation ? generation.message : undefined;
    if (!AIMessage.isInstance(message) || !message.usage_metadata) continue;
    inputTokens += message.usage_metadata.input_tokens;
    outputTokens += message.usage_metadata.output_tokens;
  }
  return { inputTokens, outputTokens };
}
