import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.validation.js';
import { RERANK_MAX_DOCUMENTS, RERANK_MODEL } from './constants/rerank-model.js';
import { parseRerankResponse } from './helpers/parse-rerank-response.js';
import type { RerankResult } from './interfaces/rerank-result.interface.js';

const RERANK_URL = 'https://api.voyageai.com/v1/rerank';
const TIMEOUT_MS = 30_000;

// Query + documents → relevance scores (Voyage rerank). The only place that knows the rerank model. Plain fetch:
// LangChain has no standalone Voyage reranker (`@langchain/mongodb` reranks only inside an Atlas vector search).
// Errors as EmbeddingsService: no key → 503; any Voyage failure → 502. More than RERANK_MAX_DOCUMENTS → 500 (the
// caller must cap). No retry yet: decided when the search route uses it.
@Injectable()
export class RerankService {
  private readonly logger = new Logger(RerankService.name);
  private readonly apiKey?: string;

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get('VOYAGE_API_KEY', { infer: true }) || undefined;
  }

  // Most relevant first.
  async rerank(query: string, documents: string[]): Promise<RerankResult[]> {
    if (!this.apiKey) throw new ServiceUnavailableException('Semantic search is not configured');
    if (documents.length === 0) return [];
    if (documents.length > RERANK_MAX_DOCUMENTS) {
      // The caller caps the candidates; reaching this is a bug, not a client error.
      throw new InternalServerErrorException(
        `Too many documents to rerank: ${documents.length} > ${RERANK_MAX_DOCUMENTS}`,
      );
    }
    let body: unknown;
    try {
      const res = await fetch(RERANK_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, documents, model: RERANK_MODEL }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      body = await res.json();
    } catch (e) {
      // Voyage's message stays in the log: it may echo request details.
      this.logger.error(`Voyage rerank failed: ${(e as Error).message}`);
      throw new BadGatewayException('Rerank service failed');
    }
    const results = parseRerankResponse(body, documents.length);
    if (!results) {
      this.logger.error('Voyage returned an invalid rerank response');
      throw new BadGatewayException('Rerank service failed');
    }
    return results.sort((a, b) => b.score - a.score);
  }
}
