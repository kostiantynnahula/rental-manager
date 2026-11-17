import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { log } from '../logger.js';

// The structured result, plus the same JSON as text for clients that ignore structuredContent.
export function toolResult(structured: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(structured) }],
    structuredContent: structured,
  };
}

// A failed API call: the status only (never the response body or request headers), logged to stderr.
export function apiError(
  tool: string,
  response: Response | undefined,
  error?: unknown,
): CallToolResult {
  const reason = response ? `API responded ${response.status}` : 'API unreachable';
  log(`${tool}: ${reason}`, error instanceof Error ? error.message : '');
  return { content: [{ type: 'text', text: `${tool} failed: ${reason}` }], isError: true };
}
