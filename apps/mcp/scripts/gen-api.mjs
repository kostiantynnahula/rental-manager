// Generates src/api/schema.d.ts from ../api/openapi.json, keeping only the operations the MCP key may call:
// `bearer` security (@Scopes + @ApiBearerAuth() in the API) whose scopes (from the required
// `API key scope(s): …` description) are all in MCP_SCOPES, plus the schemas they reference.
// The key holds only these (README → MCP server), so every other route would 403: it shouldn't even type-check —
// in particular no write route of the bot or the worker (the MCP server is read-only).
import { readFile, writeFile } from 'node:fs/promises';
import openapiTS, { astToString, COMMENT_HEADER } from 'openapi-typescript';

const INPUT = new URL('../../api/openapi.json', import.meta.url);
const OUTPUT = new URL('../src/api/schema.d.ts', import.meta.url);
const SECURITY_SCHEME = 'bearer';
const METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
const SCHEMA_REF = '#/components/schemas/';

const doc = JSON.parse(await readFile(INPUT, 'utf8'));

// Keep in sync with the README's `apikey:create --service mcp` command.
const MCP_SCOPES = new Set([
  'apartments:read',
  'meters:read',
  'readings:read',
  'statements:read',
  'tariffs:read',
  'statements:preview',
]);
const SCOPE_TEXT = /API key scopes?: ([\w:-]+(?: \+ [\w:-]+)*)/;

const isKeyRoute = (op) => op.security?.some((req) => SECURITY_SCHEME in req) ?? false;

// A key route without a readable scope fails the generation instead of being kept or dropped silently.
const scopesOf = (method, path, op) => {
  const match = SCOPE_TEXT.exec(op.description ?? '');
  if (!match)
    throw new Error(`${method.toUpperCase()} ${path}: no "API key scope: …" in its description`);
  return match[1].split(' + ');
};

const isMcpRoute = (method, path, op) =>
  isKeyRoute(op) && scopesOf(method, path, op).every((scope) => MCP_SCOPES.has(scope));

const paths = {};
for (const [path, item] of Object.entries(doc.paths)) {
  const kept = Object.fromEntries(
    Object.entries(item).filter(([key, op]) => !METHODS.has(key) || isMcpRoute(key, path, op)),
  );
  if (Object.keys(kept).some((key) => METHODS.has(key))) paths[path] = kept;
}

// Schemas reachable from the kept operations, following $refs transitively.
const allSchemas = doc.components?.schemas ?? {};
const used = new Set();
const visit = (node) => {
  if (Array.isArray(node)) return node.forEach(visit);
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string' && value.startsWith(SCHEMA_REF)) {
      const name = value.slice(SCHEMA_REF.length);
      if (!used.has(name)) {
        used.add(name);
        visit(allSchemas[name]);
      }
    } else {
      visit(value);
    }
  }
};
visit(paths);

const filtered = {
  ...doc,
  paths,
  components: {
    ...doc.components,
    schemas: Object.fromEntries(Object.entries(allSchemas).filter(([name]) => used.has(name))),
  },
};

const ast = await openapiTS(filtered);
const header = `${COMMENT_HEADER.trimEnd()}\n// Only the operations the MCP key may call (read-only): see scripts/gen-api.mjs.\n\n`;
await writeFile(OUTPUT, header + astToString(ast));
console.log(`schema.d.ts: ${Object.keys(paths).length} paths, ${used.size} schemas`);
