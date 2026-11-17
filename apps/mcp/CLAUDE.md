# apps/mcp — MCP server (Claude Desktop)

Plain TypeScript, native ESM (relative imports need `.js`), no Nest. `@modelcontextprotocol/sdk` over stdio: Claude
Desktop (or the MCP Inspector) starts `node apps/mcp/dist/main.js` as a child process. A read-only HTTP client of
the API with its own key (`--service mcp`, read scopes + `statements:preview`, see `.claude/rules/api-auth.md`).

## Commands (from repo root)

- build: `pnpm --filter mcp build` → `dist/` (Claude Desktop runs the build, so rebuild after changes;
  `pnpm --filter mcp dev` = `tsc --watch`). Not part of root `pnpm dev`: the client starts the process.
- test: `pnpm --filter mcp test` · lint: `pnpm --filter mcp lint`
- API types: root `pnpm gen:api` → `src/api/schema.d.ts` (only the API-key operations, `scripts/gen-api.mjs`).
- debug: `npx @modelcontextprotocol/inspector -e API_BASE_URL=… -e MCP_API_KEY=… node apps/mcp/dist/main.js`

## Rules

- **stdout is the protocol.** Any other byte there breaks it, and Claude Desktop drops the server silently. Log only
  with `log()` (`src/logger.ts`, stderr); `console.log`/`info` are lint errors (`no-console`).
- **Env** (`src/config/env.ts`, zod): `API_BASE_URL` (with `/api`), `MCP_API_KEY` (`rm_…`), passed by the client's
  config (`env`), not the root `.env`. Invalid → names + rules on stderr (never values), exit 1. Never log the key,
  the client options or request headers.
- **Field allowlist.** A tool never passes an API body through: it builds its result field by field
  (`toApartmentSummary`-style). Notes, leases and tenant data never leave the server unless a tool's issue says so
  (API keys get no tenant data anyway).
- **One file per tool** in `src/tools/<tool-name>.ts` exporting `register<Tool>(server, api)`, registered in
  `src/server.ts`. Each tool: `inputSchema` + `outputSchema` (zod), `annotations.readOnlyHint`, result via
  `toolResult()` (`structuredContent` + the same JSON as text); a failed call → `apiError()` (status only, never the
  body) — `src/helpers/tool-result.ts`.

## Tests

- `pnpm --filter mcp test` (Vitest, globals). Specs colocated (`foo.ts` → `foo.spec.ts`), excluded from the build.
- A tool is tested through the protocol: the real `createServer(api)` and an SDK `Client`, linked by
  `InMemoryTransport.createLinkedPair()`. The API is `fakeApi<paths>(routes)` from `@rental/testing` (an unknown
  route fails the test). Assert `structuredContent`, the text, and the requests sent; give the fake API extra fields
  (notes, lease) and assert they don't come out.
- Every new tool gets such a spec (listed, happy path, an API error).
