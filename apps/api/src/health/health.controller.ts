import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/public.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { HealthResponseDto } from './dto/health-response.dto.js';

// Don't let a hung DB connection hang the probe too.
const DB_CHECK_TIMEOUT_MS = 3000;

@ApiTags('health')
@Controller('health')
// Public and not throttled (ThrottlerGuard is only applied on AuthController), so probes never get 429.
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness + readiness: the process is up and Postgres answers' })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({
    type: HealthResponseDto,
    description: 'A dependency (Postgres) is unreachable',
  })
  async check(): Promise<HealthResponseDto> {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Database check timed out')),
            DB_CHECK_TIMEOUT_MS,
          );
        }),
      ]);
    } catch (error) {
      // Details go to the log only; the body must not leak hosts or error messages.
      this.logger.error(
        'Health check failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException({ status: 'error' });
    } finally {
      clearTimeout(timer);
    }
    return { status: 'ok' };
  }
}
