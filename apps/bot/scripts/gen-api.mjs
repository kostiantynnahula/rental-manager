// Generates src/api/schema.d.ts from ../api/openapi.json, keeping only the operations open to API keys
// (`bearer` security, i.e. @Scopes + @ApiBearerAuth() in the API) and the schemas they reference.
// The bot authenticates with a key, so every other route would 403 anyway: it shouldn't even type-check.
import { readFile, writeFile } from 'node:fs/promises';
import openapiTS, { astToString, COMMENT_HEADER } from 'openapi-typescript';

const INPUT = new URL('../../api/openapi.json', import.meta.url);
const OUTPUT = new URL('../src/api/schema.d.ts', import.meta.url);
const SECURITY_SCHEME = 'bearer';
const METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
const SCHEMA_REF = '#/components/schemas/';

const doc = JSON.parse(await readFile(INPUT, 'utf8'));

const isKeyRoute = (op) => op.security?.some((req) => SECURITY_SCHEME in req) ?? false;

const paths = {};
for (const [path, item] of Object.entries(doc.paths)) {
  const kept = Object.fromEntries(
    Object.entries(item).filter(([key, op]) => !METHODS.has(key) || isKeyRoute(op)),
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
const header = `${COMMENT_HEADER.trimEnd()}\n// Only the API-key (bearer) operations of apps/api/openapi.json: see scripts/gen-api.mjs.\n\n`;
await writeFile(OUTPUT, header + astToString(ast));
console.log(`schema.d.ts: ${Object.keys(paths).length} paths, ${used.size} schemas`);
