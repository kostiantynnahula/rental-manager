import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReadingsService } from '../readings/readings.service.js';
import { batchReadingInclude } from './helpers/batch-reading-include.js';
import { buildBatchSummary } from './helpers/batch-summary.js';
import { refusalReason } from './helpers/refusal-reason.js';
import type { BatchConfirmResult } from './interfaces/batch-confirm-result.interface.js';
import type { BatchSummary } from './interfaces/batch-summary.interface.js';

// A batch = the photos newly stored by one upload request (Photo.batchId, see api-photos.md). No table of its own.
@Injectable()
export class PhotoBatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readings: ReadingsService,
  ) {}

  // Everything the bot shows after parsing, in one response; the bot only renders it.
  async summary(batchId: string): Promise<BatchSummary> {
    const photos = await this.prisma.photo.findMany({
      where: { batchId },
      select: { id: true, parseStatus: true, parseNote: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    if (photos.length === 0) throw new NotFoundException('Photo batch not found');

    // Once each: a two-zone reading may come from two photos. All statuses (the bot shows confirmed/cancelled).
    const readings = await this.prisma.reading.findMany({
      where: { values: { some: { photoId: { in: photos.map((p) => p.id) } } } },
      include: batchReadingInclude,
    });
    const apartmentIds = [...new Set(readings.map((r) => r.meter.apartmentId))];
    const [rows, leases] = await Promise.all([
      this.readings.consumptionRows(readings),
      apartmentIds.length === 0
        ? Promise.resolve([])
        : this.prisma.lease.findMany({
            where: { apartmentId: { in: apartmentIds } },
            select: { apartmentId: true, startDate: true, endDate: true },
          }),
    ]);
    return buildBatchSummary({ batchId, photos, readings, rows, leases });
  }

  // «Підтвердити всі»: every reading that is canConfirm now (the summary's rule), each confirmed on its own
  // (ReadingsService.confirm: own transaction, the same rules as POST /readings/:id/confirm), so one refusal
  // doesn't stop the others. Sequential: two drafts of one meter + period are decided in order, not raced.
  // Only for a human action (an API key: the bot's button tapped by an allowlisted user).
  async confirm(batchId: string, userId: string): Promise<BatchConfirmResult> {
    const { apartments } = await this.summary(batchId);
    const candidates = apartments.flatMap((a) => a.readings.filter((r) => r.canConfirm));
    const result: BatchConfirmResult = { confirmed: [], refused: [] };
    for (const { reading } of candidates) {
      try {
        await this.readings.confirm(reading.id, userId);
        result.confirmed.push(reading.id);
      } catch (error) {
        const reason = refusalReason(error);
        // Unexpected → 500; the readings confirmed before it stay confirmed (each committed on its own).
        if (reason === null) throw error;
        result.refused.push({ readingId: reading.id, reason });
      }
    }
    return result;
  }
}
