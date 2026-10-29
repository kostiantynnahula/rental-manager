import { defineConfig, env } from 'prisma/config';

// Prisma 7 doesn't load .env itself. Same precedence as the app's ConfigModule:
// an optional apps/api/.env first, then the shared root .env (existing vars are never overwritten).
for (const file of ['.env', '../../.env']) {
  try {
    process.loadEnvFile(file);
  } catch {
    // File is optional.
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
