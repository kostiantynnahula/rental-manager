// Run with `pnpm --filter api seed` (add `-- --reset-passwords` to overwrite existing passwords).
// Reads users from prisma/seed-users.json (gitignored; see seed-users.example.json).
// Never log passwords or hashes here.
import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { plainToInstance } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MinLength, validateSync } from 'class-validator';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { normalizeEmail } from '../src/users/normalize-email.js';
import { PasswordService } from '../src/users/password.service.js';

const USERS_FILE = join(import.meta.dirname, 'seed-users.json');

class SeedUser {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(12)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;
}

function fail(message: string): never {
  console.error(`Seed failed: ${message}`);
  process.exit(1);
}

function loadUsers(): SeedUser[] {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(USERS_FILE, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      fail('prisma/seed-users.json not found — copy prisma/seed-users.example.json and edit it.');
    }
    fail(`prisma/seed-users.json is not valid JSON (${(error as Error).message}).`);
  }
  if (!Array.isArray(raw)) {
    fail('prisma/seed-users.json must be an array of { email, password, name? }.');
  }

  const users = plainToInstance(SeedUser, raw as object[]);
  const problems: string[] = [];
  const seen = new Set<string>();
  users.forEach((user, i) => {
    // Normalize first, so " Bob@X.com" is valid and duplicates are caught case-insensitively.
    if (typeof user.email === 'string') user.email = normalizeEmail(user.email);
    // Only constraint messages are printed — never the values, so passwords can't leak.
    const label = `users[${i}]${typeof user.email === 'string' ? ` (${user.email})` : ''}`;
    for (const e of validateSync(user, { forbidUnknownValues: false })) {
      problems.push(`${label}: ${Object.values(e.constraints ?? {}).join(', ')}`);
    }
    if (typeof user.email === 'string') {
      if (seen.has(user.email)) problems.push(`${label}: duplicate email`);
      seen.add(user.email);
    }
  });
  if (problems.length > 0) {
    fail(`invalid prisma/seed-users.json:\n  ${problems.join('\n  ')}`);
  }
  return users;
}

async function main(): Promise<void> {
  const resetPasswords = process.argv.includes('--reset-passwords');
  const users = loadUsers();

  // A standalone script, not Nest: prisma.config.ts has already loaded .env into process.env.
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) fail('DATABASE_URL is not set.');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const passwords = new PasswordService();
  let created = 0;
  let updated = 0;
  try {
    for (const user of users) {
      const { email } = user; // already normalized in loadUsers()
      const name = user.name ?? null;
      const exists = (await prisma.user.findUnique({ where: { email } })) !== null;
      // Prisma validates `create` even when the row exists, so always hash (~50 ms/user);
      // an existing user's hash is only overwritten with --reset-passwords.
      const passwordHash = await passwords.hash(user.password);

      await prisma.user.upsert({
        where: { email },
        create: { email, name, passwordHash },
        update: { name, ...(resetPasswords && { passwordHash }) },
      });

      if (exists) {
        updated++;
        console.log(`updated ${email} (password ${resetPasswords ? 'reset' : 'kept'})`);
      } else {
        created++;
        console.log(`created ${email}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
  console.log(`Seed done: ${created} created, ${updated} updated.`);
}

await main();
