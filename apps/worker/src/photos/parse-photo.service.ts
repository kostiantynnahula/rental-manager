import { Inject, Injectable, Logger } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { API_CLIENT, type ApiClient } from '../api/api-client.js';
import { apiError } from '../api/helpers/api-error.js';
import { describeMeter } from './helpers/describe-meter.js';

// One parse-photo job: load everything the parser will need. For now it only logs a summary —
// never the photo bytes or the API key.
@Injectable()
export class ParsePhotoService {
  private readonly logger = new Logger(ParsePhotoService.name);

  constructor(@Inject(API_CLIENT) private readonly api: ApiClient) {}

  async run(photoId: string): Promise<void> {
    const photo = await this.api.GET('/photos/{id}', { params: { path: { id: photoId } } });
    if (!photo.data) {
      if (photo.response.status === 404)
        throw new UnrecoverableError(`Photo ${photoId} was deleted`);
      throw apiError(`GET /photos/${photoId}`, photo.response, photo.error);
    }

    const { apartmentId, mimeType, readings } = photo.data;

    const file = await this.api.GET('/photos/{id}/file', {
      params: { path: { id: photoId } },
      parseAs: 'arrayBuffer',
    });
    if (!file.data) throw apiError(`GET /photos/${photoId}/file`, file.response, file.error);

    const meters = await this.api.GET('/apartments/{apartmentId}/meters', {
      params: { path: { apartmentId }, query: {} },
    });
    if (!meters.data) {
      throw apiError(`GET /apartments/${apartmentId}/meters`, meters.response, meters.error);
    }

    this.logger.log(
      `photo ${photoId} (apartment ${apartmentId}): ${file.data.byteLength} bytes ${mimeType}, ` +
        `${readings.length} linked readings; ${meters.data.length} meters:` +
        meters.data.map((m) => `\n  - ${describeMeter(m)}`).join(''),
    );
  }
}
