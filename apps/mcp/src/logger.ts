import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { repoRoot } from './config/env-file.js';

let logFile: string | undefined;

// Also append every log line to this file (`MCP_LOG_FILE`, for `tail -f`); stderr keeps getting them. A relative
// path is resolved against the repo root (not the client's cwd); a missing directory (e.g. the gitignored logs/) is
// created. Returns the resolved path, or undefined when unset or unusable.
export function setLogFile(
  path: string | undefined,
  base: string = repoRoot(),
): string | undefined {
  logFile = undefined;
  if (!path) return undefined;
  const file = resolve(base, path);
  try {
    mkdirSync(dirname(file), { recursive: true });
  } catch (error) {
    log(`log file disabled: ${errorMessage(error)}`);
    return undefined;
  }
  logFile = file;
  return file;
}

// stdout carries only the MCP protocol: a stray write there breaks it, and the client drops the server silently.
// Everything we print goes to stderr (the client keeps it in its MCP logs), plus the log file when set.
export function log(...parts: unknown[]): void {
  const line = `[rental-mcp] ${parts.map(String).join(' ')}\n`;
  process.stderr.write(line);
  if (!logFile) return;
  try {
    appendFileSync(logFile, line);
  } catch (error) {
    // A broken log file never stops the server: say so once, then log to stderr only.
    logFile = undefined;
    log(`log file disabled: ${errorMessage(error)}`);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
