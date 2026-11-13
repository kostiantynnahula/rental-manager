import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReadingsService } from '../readings/readings.service.js';
import { batchReadingInclude } from './helpers/batch-reading-include.js';
import { buildBatchSummary } from './helpers/batch-summary.js';
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
}
