// The search route's limits (GET /apartments/:id/condition-photos/search).
export const SEARCH_QUERY_MAX_LENGTH = 500;
export const SEARCH_DEFAULT_LIMIT = 10;
export const SEARCH_MAX_LIMIT = 50;

// photo_embeddings.kind of the description's embedding. Raw SQL that searches writes it as the literal 'TEXT':
// the partial HNSW index (`WHERE kind = 'TEXT'`) is only used when the predicate is a literal, not a parameter.
export const TEXT_EMBEDDING_KIND = 'TEXT';
