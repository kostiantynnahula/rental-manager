import { HttpStatus, UnprocessableEntityException } from '@nestjs/common';
import type { StatementWarningResponseDto } from '../dto/statement-warning-response.dto.js';

export class StatementHasWarningsError extends UnprocessableEntityException {
  constructor(warnings: StatementWarningResponseDto[]) {
    super({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      error: 'Unprocessable Entity',
      message: 'The statement has warnings — acknowledge them to issue it',
      warnings,
    });
  }
}
