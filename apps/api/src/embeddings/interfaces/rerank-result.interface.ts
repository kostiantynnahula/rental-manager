export interface RerankResult {
  // Position in the documents passed in.
  index: number;
  // Voyage's relevance score, higher = more relevant.
  score: number;
}
