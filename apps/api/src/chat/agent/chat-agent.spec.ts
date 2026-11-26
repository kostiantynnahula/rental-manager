import { AIMessage } from '@langchain/core/messages';
import type { ChatGeneration, LLMResult } from '@langchain/core/outputs';
import { newRunContext, usageCallback } from './chat-agent.js';

// One model call's result, as handleLLMEnd gets it.
function llmResult(input: number, output: number): LLMResult {
  const generation: ChatGeneration = {
    text: '',
    message: new AIMessage({
      content: '',
      usage_metadata: { input_tokens: input, output_tokens: output, total_tokens: input + output },
    }),
  };
  return { generations: [[generation]] };
}

describe('newRunContext', () => {
  it('starts empty and bound to the apartment', () => {
    const ctx = newRunContext('apt-1', () => {});
    expect(ctx).toMatchObject({
      apartmentId: 'apt-1',
      toolCalls: [],
      usage: { inputTokens: 0, outputTokens: 0 },
    });
    expect(ctx.photoIds.size).toBe(0);
  });
});

describe('usageCallback', () => {
  it('sums tokens over every model call', async () => {
    const ctx = newRunContext('apt-1', () => {});
    const cb = usageCallback(ctx);
    await cb.handleLLMEnd?.(llmResult(100, 10), 'r1');
    await cb.handleLLMEnd?.(llmResult(50, 5), 'r2');
    expect(ctx.usage).toEqual({ inputTokens: 150, outputTokens: 15 });
  });
});
