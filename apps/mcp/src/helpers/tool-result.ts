import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// The structured result, plus the same JSON as text for clients that ignore structuredContent.
export function toolResult(structured: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(structured) }],
    structuredContent: structured,
  };
}
export interface FailureInfo {
  status?: number;
  message?: string;
  cause?: string;
}

// Why a tool error happened, for the call log only: kept beside the result, never sent to the client.
const failures = new WeakMap<CallToolResult, FailureInfo>();

export function failureOf(result: CallToolResult): FailureInfo | undefined {
  return failures.get(result);
}

interface Failure {
  response?: Response;
  // The parsed error body (openapi-fetch's `error`).
  body?: unknown;
  // A thrown error (network, bad JSON).
  error?: unknown;
}

// A failed API call → a tool error. A 4xx carries the API's `message` (e.g. "Apartment not found", a validation
// message: API messages never contain row data) so the model can correct its call; anything else only the status.
// The call log (`logToolCalls`) gets the status, that message and the thrown error, never the body or headers.
export function apiError(tool: string, { response, body, error }: Failure): CallToolResult {
  const reason = response ? `API responded ${response.status}` : 'API unreachable';
  const message = response && response.status < 500 ? apiMessage(body) : undefined;
  const text = `${tool} failed: ${reason}${message ? `: ${message}` : ''}`;
  const result: CallToolResult = { content: [{ type: 'text', text }], isError: true };
  failures.set(result, {
    status: response?.status,
    message,
    cause: error instanceof Error ? error.message : undefined,
  });
  return result;
}

// Nest error bodies: { message: string | string[] }.
function apiMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || !('message' in body)) return undefined;
  const { message } = body;
  const parts = (Array.isArray(message) ? message : [message]).filter(
    (m): m is string => typeof m === 'string',
  );
  return parts.length ? parts.join('; ').slice(0, 300) : undefined;
}

type Outcome<T> = { ok: true; data: T } | { ok: false; result: CallToolResult };

// One API call → its data, or the tool error to return as is (non-2xx or thrown).
export async function callApi<T>(
  tool: string,
  request: () => Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<Outcome<T>> {
  try {
    const { data, error, response } = await request();
    if (data === undefined) return { ok: false, result: apiError(tool, { response, body: error }) };
    return { ok: true, data };
  } catch (error) {
    return { ok: false, result: apiError(tool, { error }) };
  }
}
