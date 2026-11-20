// The embedding model. Only EmbeddingsService uses it: documents and queries must be embedded by the same model,
// so no other code (nor the worker) may know it. Changing it: new rows per model (photo_embeddings.model), then
// `pnpm --filter api embed:backfill`. The dimension must match the `vector(1024)` column.
export const EMBEDDING_MODEL = 'voyage-4';
export const EMBEDDING_DIMENSIONS = 1024;
