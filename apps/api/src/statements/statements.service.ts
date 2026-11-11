import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ApartmentsService } from '../apartments/apartments.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { StatementStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StatementPreviewResponseDto } from './dto/statement-preview-response.dto.js';
import { StatementWarningResponseDto } from './dto/statement-warning-response.dto.js';
import { StatementHasWarningsError } from './errors/statement-has-warnings.error.js';
import { StatementTotalChangedError } from './errors/statement-total-changed.error.js';
import { calculateStatement, manualAmountsProblem } from './helpers/statement-calculator.js';
import { statementLineRows } from './helpers/statement-line-rows.js';
import {
  statementWithDetailsInclude,
  type StatementWithDetails,
} from './helpers/statement-with-details.js';
import type { StatementConsumptionRow } from './interfaces/statement-consumption-row.interface.js';
import type { StatementPage } from './interfaces/statement-page.interface.js';
import type { StatementPreview } from './interfaces/statement-preview.interface.js';

@Injectable()
export class StatementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apartments: ApartmentsService,
  ) {}

  // Writes nothing.
  async preview(
    apartmentId: string,
    period: Date,
    manualAmounts: Record<string, number>,
  ): Promise<StatementPreview> {
    await this.apartments.findOrThrow(apartmentId);
    return this.calculate(this.prisma, apartmentId, period, manualAmounts);
  }

  // A period that's already issued gets its 409 from the partial unique index statements_one_issued_per_period (via
  // PrismaExceptionFilter): one path for the plain case and for two concurrent issues.
  async issue(
    apartmentId: string,
    period: Date,
    manualAmounts: Record<string, number>,
    expectedTotal: number,
    acknowledgeWarnings: boolean,
    userId: string,
  ): Promise<StatementWithDetails> {
    await this.apartments.findOrThrow(apartmentId);
    return this.prisma.$transaction(async (tx) => {
      const preview = await this.calculate(tx, apartmentId, period, manualAmounts);
      if (preview.total !== expectedTotal) {
        throw new StatementTotalChangedError(StatementPreviewResponseDto.from(preview, period));
      }
      if (preview.warnings.length > 0 && !acknowledgeWarnings) {
        throw new StatementHasWarningsError(
          preview.warnings.map((w) => StatementWarningResponseDto.from(w)),
        );
      }
      if (preview.lines.reduce((acc, l) => acc + l.amount, 0) !== preview.total) {
        throw new InternalServerErrorException('Statement lines do not sum to the total');
      }
      return tx.statement.create({
        data: {
          apartmentId,
          period,
          leaseId: preview.leaseId,
          totalAmount: preview.total,
          warnings: preview.warnings as unknown as Prisma.InputJsonArray,
          issuedById: userId,
          lines: { create: statementLineRows(preview.lines) },
        },
        include: statementWithDetailsInclude,
      });
    });
  }

  async list(
    apartmentId: string,
    page: number,
    pageSize: number,
    period?: Date,
  ): Promise<StatementPage> {
    await this.apartments.findOrThrow(apartmentId);
    const where = { apartmentId, period };
    const [items, total] = await Promise.all([
      this.prisma.statement.findMany({
        where,
        orderBy: [{ period: 'desc' }, { issuedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.statement.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOrThrow(id: string): Promise<StatementWithDetails> {
    const statement = await this.prisma.statement.findUnique({
      where: { id },
      include: statementWithDetailsInclude,
    });
    if (!statement) throw new NotFoundException('Statement not found');
    return statement;
  }

  // The status in the WHERE makes it atomic: of two concurrent cancels, one updates nothing.
  async cancel(
    id: string,
    note: string | undefined,
    userId: string,
  ): Promise<StatementWithDetails> {
    const { count } = await this.prisma.statement.updateMany({
      where: { id, status: StatementStatus.ISSUED },
      data: {
        status: StatementStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledById: userId,
        cancelNote: note,
      },
    });
    const statement = await this.findOrThrow(id);
    if (count === 0) throw new ConflictException('Only an issued statement can be cancelled');
    return statement;
  }

  // Loads the apartment's data; every billing rule lives in calculateStatement. An amount for a tariff that isn't an
  // active MANUAL tariff of the apartment is a client error (400), before any 409/422 of issuing.
  private async calculate(
    db: Prisma.TransactionClient,
    apartmentId: string,
    period: Date,
    manualAmounts: Record<string, number>,
  ): Promise<StatementPreview> {
    const [attachments, meters, leases] = await Promise.all([
      db.apartmentTariff.findMany({
        where: { apartmentId },
        include: { tariff: { include: { prices: true } } },
      }),
      db.meter.findMany({ where: { apartmentId } }),
      db.lease.findMany({ where: { apartmentId } }),
    ]);
    // The period filter stays outside the view: it isn't a PARTITION BY column, so it isn't pushed down and LAG
    // still sees each meter's full history.
    // The reading_values join only adds the value's photo (for 📷 links in the statement).
    const consumption = await db.$queryRaw<StatementConsumptionRow[]>`
      SELECT rc."meterId", rc."zone", rc."consumption", rc."previousPeriod", v."photoId"
      FROM "reading_consumption" rc
      JOIN "reading_values" v ON v."readingId" = rc."readingId" AND v."zone" = rc."zone"
      WHERE rc."meterId" = ANY(${meters.map((m) => m.id)}::uuid[])
        AND rc."period" = ${period}::date`;
    const input = { period, attachments, meters, leases, consumption, manualAmounts };
    const problem = manualAmountsProblem(input);
    if (problem) throw new BadRequestException(problem);
    return calculateStatement(input);
  }
}
