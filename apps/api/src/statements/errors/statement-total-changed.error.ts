import { ConflictException, HttpStatus } from '@nestjs/common';
import type { StatementPreviewResponseDto } from '../dto/statement-preview-response.dto.js';

// The data changed after the client's preview: nothing is issued, the body carries the fresh preview.
export class StatementTotalChangedError extends ConflictException {
  constructor(preview: StatementPreviewResponseDto) {
    super({
      statusCode: HttpStatus.CONFLICT,
      error: 'Conflict',
      message: 'The statement total has changed — review the fresh preview',
      preview,
    });
  }
}
