import { Inject, Injectable } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { API_CLIENT, type ApiClient } from './api-client.js';
import { apiError } from './helpers/api-error.js';
import type { components } from './schema.js';

type Schemas = components['schemas'];
type Photo = Schemas['PhotoDetailResponseDto'];
type Meter = Schemas['MeterResponseDto'];
type DraftValue = Schemas['CreateDraftValueDto'];
type ParseResult = Schemas['PhotoParseResult'];
type ConditionPhotoResult = Schemas['SetConditionPhotoDescriptionDto'];

// POST /meters/{meterId}/draft-values: posted (201 new draft / 200 added or already there), or an expected refusal
// (409: zone already filled from another photo / meter removed; 400) — logged by the caller, not a job failure.
export type DraftValueResult =
  | { ok: true; created: boolean; draftId: string }
  | { ok: false; status: 409 | 400; message: string; readingId?: string };

// PUT /photos/{id}/parse-result is best effort: the caller logs a refusal itself (with its own hint).
export type ParseResultOutcome = { ok: true } | { ok: false; status: number };

// PUT /condition-photos/{id}/description: the caller decides (a description must be saved — the job retries; a
// failure report is best effort).
export type DescriptionOutcome = { ok: true } | { ok: false; status: number; message: string };

// The worker's calls to the API, in domain terms: the only place that touches the openapi-fetch client. Each
// method returns data or throws (`apiError`: 4xx → UnrecoverableError, 5xx → retried); expected refusals come back
// as a typed result. Network errors are thrown as they are (retried).
@Injectable()
export class WorkerApi {
  constructor(@Inject(API_CLIENT) private readonly client: ApiClient) {}

  async getPhoto(id: string): Promise<Photo> {
    const res = await this.client.GET('/photos/{id}', { params: { path: { id } } });
    if (res.data) return res.data;
    if (res.response.status === 404) throw new UnrecoverableError(`Photo ${id} was deleted`);
    throw apiError(`GET /photos/${id}`, res.response, res.error);
  }

  async getPhotoFile(id: string): Promise<Buffer> {
    const res = await this.client.GET('/photos/{id}/file', {
      params: { path: { id } },
      parseAs: 'arrayBuffer',
    });
    if (!res.data) throw apiError(`GET /photos/${id}/file`, res.response, res.error);
    return Buffer.from(res.data);
  }

  // Installed meters of the apartment, with `lastReading`.
  async getApartmentMeters(apartmentId: string): Promise<Meter[]> {
    const res = await this.client.GET('/apartments/{apartmentId}/meters', {
      params: { path: { apartmentId }, query: {} },
    });
    if (!res.data) throw apiError(`GET /apartments/${apartmentId}/meters`, res.response, res.error);
    return res.data;
  }

  // Every active meter of active apartments (candidates for an inbox photo).
  async getActiveMeters(): Promise<Meter[]> {
    const res = await this.client.GET('/meters', { params: { query: { active: 'true' } } });
    if (!res.data) throw apiError('GET /meters?active=true', res.response, res.error);
    return res.data;
  }

  async postDraftValue(meterId: string, body: DraftValue): Promise<DraftValueResult> {
    const res = await this.client.POST('/meters/{meterId}/draft-values', {
      params: { path: { meterId } },
      body,
    });
    if (res.data) {
      return { ok: true, created: res.response.status === 201, draftId: res.data.id };
    }
    const status = res.response.status;
    if (status === 409 || status === 400) {
      const readingId = bodyField(res.error, 'readingId');
      return {
        ok: false,
        status,
        message: bodyField(res.error, 'message') ?? '',
        ...(readingId !== undefined && { readingId }),
      };
    }
    throw apiError(`POST /meters/${meterId}/draft-values`, res.response, res.error);
  }

  async putParseResult(
    photoId: string,
    status: ParseResult,
    note?: string,
  ): Promise<ParseResultOutcome> {
    const res = await this.client.PUT('/photos/{id}/parse-result', {
      params: { path: { id: photoId } },
      body: { status, note },
    });
    return res.response.ok ? { ok: true } : { ok: false, status: res.response.status };
  }

  async getConditionPhotoFile(id: string): Promise<Buffer> {
    const res = await this.client.GET('/condition-photos/{id}/file', {
      params: { path: { id } },
      parseAs: 'arrayBuffer',
    });
    if (res.data) return Buffer.from(res.data);
    if (res.response.status === 404) {
      throw new UnrecoverableError(`Condition photo ${id} was deleted`);
    }
    throw apiError(`GET /condition-photos/${id}/file`, res.response, res.error);
  }

  async putConditionPhotoDescription(
    id: string,
    body: ConditionPhotoResult,
  ): Promise<DescriptionOutcome> {
    const res = await this.client.PUT('/condition-photos/{id}/description', {
      params: { path: { id } },
      body,
    });
    if (res.response.ok) return { ok: true };
    return {
      ok: false,
      status: res.response.status,
      message: bodyField(res.error, 'message') ?? '',
    };
  }
}

// A field of an API error body ({ statusCode, message, ... }), as a string; undefined when absent.
function bodyField(body: unknown, field: 'message' | 'readingId'): string | undefined {
  return typeof body === 'object' && body !== null && field in body
    ? String((body as Record<string, unknown>)[field])
    : undefined;
}
