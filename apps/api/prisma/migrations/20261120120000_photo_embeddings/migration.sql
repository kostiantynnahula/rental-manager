-- CreateTable
CREATE TABLE "photo_embeddings" (
    "photoId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "embedding" vector(1024) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_embeddings_pkey" PRIMARY KEY ("photoId","kind","model")
);

-- AddForeignKey
ALTER TABLE "photo_embeddings" ADD CONSTRAINT "photo_embeddings_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "condition_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Raw SQL (Prisma can't express HNSW): the index for cosine distance (`<=>`) used by the semantic search.
-- Partial (one per kind) on purpose: Prisma ignores partial indexes, a full one would show as drift (DROP INDEX in
-- the next migration). Queries must compare kind with the literal 'TEXT' (not a bind parameter) to use it.
CREATE INDEX "photo_embeddings_text_hnsw" ON "photo_embeddings" USING hnsw ("embedding" vector_cosine_ops)
  WHERE "kind" = 'TEXT';
