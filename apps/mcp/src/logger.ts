// stdout carries only the MCP protocol: a stray write there breaks it, and Claude Desktop drops the server
// silently. Everything we print goes to stderr (Claude Desktop keeps it in its MCP logs).
export function log(...parts: unknown[]): void {
  process.stderr.write(`[rental-mcp] ${parts.map(String).join(' ')}\n`);
}
