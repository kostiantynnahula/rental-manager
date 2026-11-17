import { appendFileSync } from 'node:fs';

let logFile: string | undefined;

// Also append every log line to this file (`MCP_LOG_FILE`, for `tail -f`); stderr keeps getting them.
export function setLogFile(path: string | undefined): void {
  logFile = path;
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
    log(`log file disabled: ${error instanceof Error ? error.message : String(error)}`);
  }
}
