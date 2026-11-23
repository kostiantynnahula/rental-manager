// The search route's limits (GET /apartments/:id/condition-photos/search).
export const SEARCH_QUERY_MAX_LENGTH = 500;
export const SEARCH_DEFAULT_LIMIT = 10;
export const SEARCH_MAX_LIMIT = 50;

// photo_embeddings.kind of the description's embedding. Raw SQL that searches writes it as the literal 'TEXT':
// the partial HNSW index (`WHERE kind = 'TEXT'`) is only used when the predicate is a literal, not a parameter.
export const TEXT_EMBEDDING_KIND = 'TEXT';

// The route's two stages: the SEARCH_CANDIDATES nearest by vector, then Voyage rerank keeps those scoring
// ≥ RERANK_MIN_SCORE (first `limit` of them). Vector scores can't be thresholded — for "мийка" the right photo got
// 0.241 and a balcony 0.234 — while rerank scores split cleanly (#140, `search:debug` on 11 photos): relevant
// ≥ 0.467, irrelevant ≤ 0.428 (any kitchen gets ~0.40 for a kitchen item). 0.45 sits in that gap. Re-check with
// `search:debug` after a change of the description prompt or the rerank model.
export const SEARCH_CANDIDATES = 50;
export const RERANK_MIN_SCORE = 0.45;
