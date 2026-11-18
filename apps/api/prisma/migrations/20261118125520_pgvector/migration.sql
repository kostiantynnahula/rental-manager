-- pgvector, for embeddings (semantic search). Installed here with raw SQL rather than Prisma's
-- `postgresqlExtensions` preview feature, which is deprecated. Needs the pgvector/pgvector image (docker-compose.yml).
CREATE EXTENSION IF NOT EXISTS vector;
