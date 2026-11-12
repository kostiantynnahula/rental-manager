import { Inject, Injectable } from '@nestjs/common';
import { API_CLIENT, type ApiClient } from '../api/api-client.js';
import type { components } from '../api/schema.js';
import { ApiCallError, apiMessage } from './helpers/api-call-error.js';

type Schemas = components['schemas'];
export type Photo = Schemas['PhotoDetailResponseDto'];
export type Reading = Schemas['ReadingResponseDto'];
export type Meter = Schemas['MeterResponseDto'];
export type Apartment = Schemas['ApartmentDetailResponseDto'];

// Reason stored in the reading's note when the owner cancels from Telegram.
const CANCEL_REASON = 'Скасовано в Telegram';

// The API calls behind the parse results (scopes: photos:read, readings:read, meters:read, apartments:read,
// readings:confirm, readings:cancel, photos:assign). Every refusal → ApiCallError with the API's message, so the
// caller can show it (e.g. "value lower than the previous one"). Never log headers.
@Injectable()
export class ResultsApiService {
  constructor(@Inject(API_CLIENT) private readonly api: ApiClient) {}

  async photo(id: string): Promise<Photo> {
    const { data, error, response } = await this.api.GET('/photos/{id}', {
      params: { path: { id } },
    });
    return this.unwrap(`GET /photos/${id}`, data, error, response);
  }

  async reading(id: string): Promise<Reading> {
    const { data, error, response } = await this.api.GET('/readings/{id}', {
      params: { path: { id } },
    });
    return this.unwrap(`GET /readings/${id}`, data, error, response);
  }

  // Installed meters of the apartment, each with its last CONFIRMED reading (the "previous value").
  async meters(apartmentId: string): Promise<Meter[]> {
    const { data, error, response } = await this.api.GET('/apartments/{apartmentId}/meters', {
      params: { path: { apartmentId } },
    });
    return this.unwrap(`GET /apartments/${apartmentId}/meters`, data, error, response);
  }

  // Active apartments, each with its current lease.
  async apartments(): Promise<Apartment[]> {
    const { data, error, response } = await this.api.GET('/apartments', {
      params: { query: { active: 'true' } },
    });
    return this.unwrap('GET /apartments', data, error, response);
  }

  async confirm(id: string): Promise<Reading> {
    const { data, error, response } = await this.api.POST('/readings/{id}/confirm', {
      params: { path: { id } },
    });
    return this.unwrap(`POST /readings/${id}/confirm`, data, error, response);
  }

  async cancel(id: string): Promise<Reading> {
    const { data, error, response } = await this.api.POST('/readings/{id}/cancel', {
      params: { path: { id } },
      body: { reason: CANCEL_REASON },
    });
    return this.unwrap(`POST /readings/${id}/cancel`, data, error, response);
  }

  async assign(photoId: string, apartmentId: string): Promise<Photo> {
    const { data, error, response } = await this.api.PATCH('/photos/{id}', {
      params: { path: { id: photoId } },
      body: { apartmentId },
    });
    return this.unwrap(`PATCH /photos/${photoId}`, data, error, response);
  }

  private unwrap<T>(what: string, data: T | undefined, error: unknown, response: Response): T {
    if (data !== undefined) return data;
    throw new ApiCallError(what, response.status, apiMessage(error));
  }
}
