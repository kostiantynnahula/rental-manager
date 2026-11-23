import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EmbeddingsService } from '../embeddings/embeddings.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { ConditionPhotoIndexStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TEXT_EMBEDDING_KIND } from './constants/condition-photo-search.js';
import { SearchConditionPhotosQueryDto } from './dto/search-condition-photos-query.dto.js';
import { embeddingText } from './helpers/embedding-text.js';
import { toVectorLiteral } from './helpers/vector-literal.js';
import type { BackfillResult } from './interfaces/backfill-result.interface.js';
import type { ConditionPhotoSearchFilters } from './interfaces/condition-photo-search-filters.interface.js';
import type { ConditionPhotoDescription } from './interfaces/condition-photo-description.interface.js';
import type { ConditionPhotoSearchHit } from './interfaces/condition-photo-search-hit.interface.js';

// Embeddings of condition photos (DESCRIBED → INDEXED) and the semantic search over them. The only raw SQL of the
// feature: Prisma can neither write nor compare a `vector`. Its own module (no Multer/S3/Redis), so the CLI can use it.
@Injectable()
export class ConditionPhotoIndexService {
  private readonly logger = new Logger(ConditionPhotoIndexService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  // Embeds the description (Voyage first, outside the transaction), then upserts the row and marks the photo
  // INDEXED. Idempotent: a retry overwrites the vector. 502/503 from EmbeddingsService leave the photo as it was.
  // Only while the photo still has this description: a newer PUT may have saved another one during the Voyage call
  // (then it owns the indexing — this vector is stale and is dropped).
  async index(photoId: string, description: ConditionPhotoDescription): Promise<void> {
    const vector = toVectorLiteral(await this.embeddings.embedDocument(embeddingText(description)));
    await this.prisma.$transaction(async (tx) => {
      // INSERT … SELECT: a photo deleted or re-described meanwhile inserts nothing instead of failing the FK or
      // storing a stale vector. FOR UPDATE locks the row until the commit, so no PUT can change it in between.
      // jsonb `=` ignores key order.
      const inserted = await tx.$executeRaw`
        INSERT INTO photo_embeddings ("photoId", kind, model, embedding)
        SELECT id, ${TEXT_EMBEDDING_KIND}, ${this.embeddings.model}, ${vector}::vector
        FROM condition_photos
        WHERE id = ${photoId}::uuid AND description = ${JSON.stringify(description)}::jsonb
        FOR UPDATE
        ON CONFLICT ("photoId", kind, model)
        DO UPDATE SET embedding = EXCLUDED.embedding, "createdAt" = now()`;
      if (inserted === 0) {
        const exists = await tx.conditionPhoto.count({ where: { id: photoId } });
        if (!exists) throw new NotFoundException('Condition photo not found');
        this.logger.warn(`Photo ${photoId}: description changed while embedding, skipped`);
        return;
      }
      await tx.conditionPhoto.update({
        where: { id: photoId },
        data: { indexStatus: ConditionPhotoIndexStatus.INDEXED, indexNote: null },
      });
    });
  }

  // The search route: the `limit` nearest candidates. The caller checks the apartment and the dates.
  search(
    apartmentId: string,
    query: SearchConditionPhotosQueryDto,
  ): Promise<ConditionPhotoSearchHit[]> {
    return this.candidates(apartmentId, query, query.limit);
  }

  // The `n` nearest photos by vector, nearest first, only embeddings of the current model (a photo not re-embedded
  // after a model change isn't found until the backfill). `score` = 1 − cosine distance.
  async candidates(
    apartmentId: string,
    query: ConditionPhotoSearchFilters,
    n: number,
  ): Promise<ConditionPhotoSearchHit[]> {
    const vector = toVectorLiteral(await this.embeddings.embedQuery(query.q));
    const filters = [
      Prisma.sql`p."apartmentId" = ${apartmentId}::uuid`,
      // A re-described photo is DESCRIBED until its new vector is stored; its old row must not be searched meanwhile.
      Prisma.sql`p."indexStatus" = 'INDEXED'::condition_photo_index_status`,
      Prisma.sql`e.model = ${this.embeddings.model}`,
      // Dates as YYYY-MM-DD strings: a JS Date would be cast through the session time zone.
      ...(query.event ? [Prisma.sql`p.event = ${query.event}::condition_photo_event`] : []),
      ...(query.from ? [Prisma.sql`p."takenOn" >= ${query.from}::date`] : []),
      ...(query.to ? [Prisma.sql`p."takenOn" <= ${query.to}::date`] : []),
    ];
    const rows = await this.prisma.$transaction(async (tx) => {
      // pgvector ≥ 0.8: without it HNSW returns its ef_search (40) nearest of ALL apartments and the filters run
      // after, so a search could find fewer than `limit` (or none). strict_order keeps scanning, still by distance.
      await tx.$executeRaw`SET LOCAL hnsw.iterative_scan = strict_order`;
      // kind as a literal: the partial index's predicate (see TEXT_EMBEDDING_KIND).
      return tx.$queryRaw<{ id: string; score: number }[]>`
        SELECT p.id, 1 - (e.embedding <=> ${vector}::vector) AS score
        FROM photo_embeddings e
        JOIN condition_photos p ON p.id = e."photoId"
        WHERE e.kind = 'TEXT' AND ${Prisma.join(filters, ' AND ')}
        ORDER BY e.embedding <=> ${vector}::vector
        LIMIT ${n}`;
    });
    if (rows.length === 0) return [];
    const photos = await this.prisma.conditionPhoto.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });
    const byId = new Map(photos.map((p) => [p.id, p]));
    // A photo deleted between the two queries is just skipped.
    return rows.flatMap(({ id, score }) => {
      const photo = byId.get(id);
      return photo ? [{ photo, score: Number(score) }] : [];
    });
  }

  // Photos with a description but no embedding of the current model: after an outage of Voyage (the photo stayed
  // DESCRIBED) or a model change. One by one; a failure is logged and the rest go on.
  async backfill(): Promise<BackfillResult> {
    const photos = await this.prisma.conditionPhoto.findMany({
      where: {
        description: { not: Prisma.DbNull },
        embeddings: { none: { kind: TEXT_EMBEDDING_KIND, model: this.embeddings.model } },
      },
      select: { id: true, description: true },
      orderBy: { uploadedAt: 'asc' },
    });
    const result: BackfillResult = { total: photos.length, indexed: 0, failed: 0 };
    for (const { id, description } of photos) {
      try {
        // Validated by ConditionPhotoDescriptionDto when it was stored.
        await this.index(id, description as unknown as ConditionPhotoDescription);
        result.indexed++;
      } catch (e) {
        result.failed++;
        this.logger.error(`Photo ${id} not indexed: ${(e as Error).message}`);
      }
    }
    return result;
  }
}
