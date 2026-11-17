import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createApiClient } from './api/api-client.js';
import { loadEnv } from './config/env.js';
import { loadEnvFile } from './config/env-file.js';
import { log, setLogFile } from './logger.js';
import { createServer } from './server.js';

// Started by Claude Code / Claude Desktop (or the MCP Inspector) as a child process; it talks JSON-RPC over
// stdin/stdout.
async function main(): Promise<void> {
  const envFile = loadEnvFile(process.env);
  const env = loadEnv(process.env);
  setLogFile(env.MCP_LOG_FILE);
  log(envFile ? `env loaded from ${envFile}` : 'no .env file found (using the process env)');
  const server = createServer(createApiClient(env));
  await server.connect(new StdioServerTransport());
  log('connected over stdio');
}

main().catch((error: unknown) => {
  log(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
