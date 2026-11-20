import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoyageEmbeddings } from '@langchain/mongodb';
import { Env } from '../config/env.validation.js';
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from './constants/embedding-model.js';

type InputType = 'document' | 'query';

// Text → vector (Voyage via LangChain). The only place that knows the model. Voyage embeds a document and a query
// differently (`input_type`), and the LangChain class sets it per instance, hence two clients.
// Errors: no key → 503; any Voyage failure → 502 (a 5xx: the worker retries its job).
@Injectable()
export class EmbeddingsService {
  readonly model = EMBEDDING_MODEL;
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly clients?: Record<InputType, VoyageEmbeddings>;

  constructor(config: ConfigService<Env, true>) {
    const apiKey = config.get('VOYAGE_API_KEY', { infer: true });
    if (apiKey) {
      this.clients = {
        document: this.client(apiKey, 'document'),
        query: this.client(apiKey, 'query'),
      };
    }
  }

  embedDocument(text: string): Promise<number[]> {
    return this.embed(text, 'document');
  }

  embedQuery(text: string): Promise<number[]> {
    return this.embed(text, 'query');
  }

  private async embed(text: string, inputType: InputType): Promise<number[]> {
    if (!this.clients) throw new ServiceUnavailableException('Semantic search is not configured');
    let vector: number[];
    try {
      // embedQuery = one text, one request; its input_type is the instance's.
      vector = await this.clients[inputType].embedQuery(text);
    } catch (e) {
      // Voyage's message stays in the log: it may echo request details.
      this.logger.error(`Voyage ${inputType} embedding failed: ${(e as Error).message}`);
      throw new BadGatewayException('Embedding service failed');
    }
    if (vector?.length !== EMBEDDING_DIMENSIONS || !vector.every(Number.isFinite)) {
      this.logger.error(
        `Voyage returned an invalid ${inputType} vector (length ${vector?.length})`,
      );
      throw new BadGatewayException('Embedding service failed');
    }
    return vector;
  }

  private client(apiKey: string, inputType: InputType): VoyageEmbeddings {
    return new VoyageEmbeddings({
      apiKey,
      modelName: EMBEDDING_MODEL,
      inputType,
      outputDimension: EMBEDDING_DIMENSIONS,
      // A failed request fails fast: the worker's job (or the user) retries.
      maxRetries: 2,
    });
  }
}
