// Manage API keys of service users (worker, bots). Run from the repo root:
//   pnpm --filter api apikey:create --service worker --name "dev laptop" --scopes photos:read
//   pnpm --filter api apikey:list
//   pnpm --filter api apikey:revoke rm_ab12cd34
// The scripts build first: Nest DI needs decorator metadata, which tsx can't emit.
// The full key is printed only by `create`; everything else shows the prefix.
import { parseArgs } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { ApiKeysService } from '../api-keys/api-keys.service.js';
import { API_KEY_SCOPES } from '../api-keys/constants/api-key-scopes.js';
import { parseScopes } from '../api-keys/helpers/parse-scopes.js';
import { CliModule } from './cli.module.js';

const USAGE = `Usage:
  api-keys create --service <name> --name <label> --scopes <a,b>
  api-keys list
  api-keys revoke <prefix>
Scopes: ${API_KEY_SCOPES.join(', ')}`;

async function create(keys: ApiKeysService, args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      service: { type: 'string' },
      name: { type: 'string' },
      scopes: { type: 'string' },
    },
  });
  if (!values.service || !values.name || values.scopes === undefined) {
    throw new Error(`create needs --service, --name and --scopes.\n${USAGE}`);
  }
  const scopes = parseScopes(values.scopes);
  const { key, apiKey } = await keys.create({ service: values.service, name: values.name, scopes });
  console.log(
    `Created ${apiKey.prefix} (${apiKey.name}) for ${values.service}, scopes: ${scopes.join(', ')}`,
  );
  console.log('\nStore this key now; it cannot be shown again:\n');
  console.log(key);
}

async function list(keys: ApiKeysService): Promise<void> {
  const rows = await keys.list();
  if (rows.length === 0) {
    console.log('No API keys.');
    return;
  }
  console.table(
    rows.map((k) => ({
      prefix: k.prefix,
      name: k.name,
      user: k.user.isActive ? k.user.email : `${k.user.email} (inactive)`,
      scopes: k.scopes.join(', '),
      lastUsedAt: k.lastUsedAt?.toISOString() ?? '',
      revokedAt: k.revokedAt?.toISOString() ?? '',
    })),
  );
}

async function revoke(keys: ApiKeysService, args: string[]): Promise<void> {
  const { positionals } = parseArgs({ args, allowPositionals: true });
  const [prefix] = positionals;
  if (!prefix || positionals.length > 1)
    throw new Error(`revoke needs exactly one prefix.\n${USAGE}`);
  await keys.revoke(prefix);
  console.log(`Revoked ${prefix}`);
}

async function main(): Promise<void> {
  // pnpm may pass a literal `--` through before the script's own args.
  const argv = process.argv.slice(2).filter((a, i) => !(i <= 1 && a === '--'));
  const [command, ...args] = argv;
  const app = await NestFactory.createApplicationContext(CliModule, { logger: ['error', 'warn'] });
  try {
    const keys = app.get(ApiKeysService);
    if (command === 'create') await create(keys, args);
    else if (command === 'list') await list(keys);
    else if (command === 'revoke') await revoke(keys, args);
    else throw new Error(USAGE);
  } finally {
    await app.close();
  }
}

try {
  await main();
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}
