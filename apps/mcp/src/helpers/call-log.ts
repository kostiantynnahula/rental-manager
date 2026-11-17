import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { log } from '../logger.js';
import { failureOf } from './tool-result.js';

const MAX_ARGS = 200;

type Callback = (...args: unknown[]) => CallToolResult | Promise<CallToolResult>;

// Logs every tool call in one line, wrapping the callbacks at registration (tools stay unaware):
//   tool get_statement {"statementId":"…"} → ok 142ms
//   tool get_apartment {"apartmentId":"…"} → error 404 "Apartment not found" 35ms
// Arguments (truncated) and the API's status/message only: never response bodies, the key or headers.
// Input that fails the zod schema is rejected by the SDK before the callback, so it isn't logged.
export function logToolCalls(server: McpServer): void {
  const register = server.registerTool.bind(server);
  server.registerTool = ((name: string, config: { inputSchema?: unknown }, callback: Callback) =>
    register(
      name,
      config as never,
      // Without an inputSchema the SDK calls back with `extra` only (request info, headers): log no args then.
      withCallLog(name, config.inputSchema !== undefined, callback) as never,
    )) as McpServer['registerTool'];
}

function withCallLog(name: string, hasArgs: boolean, callback: Callback): Callback {
  return async (...params) => {
    const start = performance.now();
    const prefix = `tool ${name} ${formatArgs(hasArgs ? params[0] : {})} →`;
    const elapsed = () => `${Math.round(performance.now() - start)}ms`;
    try {
      const result = await callback(...params);
      log(prefix, result.isError ? describeError(result) : 'ok', elapsed());
      return result;
    } catch (error) {
      log(prefix, 'threw', error instanceof Error ? error.message : String(error), elapsed());
      throw error;
    }
  };
}

export function formatArgs(args: unknown): string {
  const json = JSON.stringify(args ?? {});
  return json.length > MAX_ARGS ? `${json.slice(0, MAX_ARGS)}…` : json;
}

function describeError(result: CallToolResult): string {
  const failure = failureOf(result);
  if (!failure) return 'error';
  const { status, message, cause } = failure;
  return [
    'error',
    status ?? 'unreachable',
    message && JSON.stringify(message),
    cause && `(${cause})`,
  ]
    .filter(Boolean)
    .join(' ');
}
