// The search route's limits (GET /apartments/:id/condition-photos/search).
export const SEARCH_QUERY_MAX_LENGTH = 500;
export const SEARCH_DEFAULT_LIMIT = 10;
export const SEARCH_MAX_LIMIT = 50;

// photo_embeddings.kind of the description's embedding. Raw SQL that searches writes it as the literal 'TEXT':
// the partial HNSW index (`WHERE kind = 'TEXT'`) is only used when the predicate is a literal, not a parameter.
export const TEXT_EMBEDDING_KIND = 'TEXT';

// The route's two stages: the SEARCH_CANDIDATES nearest by vector, then Voyage rerank keeps those scoring
// ≥ RERANK_MIN_SCORE (first `limit` of them).
// SEARCH_CANDIDATES must stay ≥ SEARCH_MAX_LIMIT (else a big `limit` can't be filled) and ≤ RERANK_MAX_DOCUMENTS
// (Voyage's per-request cap).
export const SEARCH_CANDIDATES = 50;
// Vector scores can't be thresholded: for "мийка" the right photo got 0.240 and a kitchen without one 0.247. Rerank
// scores split (#141, `search:debug` on 11 photos, 9 queries, after the #146 synonyms): relevant ≥ 0.551,
// irrelevant ≤ 0.474. A kitchen without the item still gets ~0.40, ~0.47 when the query names the room
// ("кран на кухні"), so #140's 0.45 kept those; 0.50 sits in the gap. Re-check with `search:debug` after a change
// of the description prompt or the rerank model.
export const RERANK_MIN_SCORE = 0.5;
