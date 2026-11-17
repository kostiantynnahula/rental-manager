import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from './api/api-client.js';
import { registerListApartments } from './tools/list-apartments.js';

// One file per tool in tools/, each registered here.
export function createServer(api: ApiClient): McpServer {
  const server = new McpServer({ name: 'rental-manager', version: '0.0.1' });
  registerListApartments(server, api);
  return server;
}
