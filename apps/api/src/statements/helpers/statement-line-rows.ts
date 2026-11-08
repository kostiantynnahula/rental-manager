import type { Prisma } from '../../generated/prisma/client.js';
import type { StatementLineDetail } from '../interfaces/statement-line-detail.interface.js';
import type { StatementLine } from '../interfaces/statement-line.interface.js';

// Calculator lines as rows to insert, in the calculator's order.
export function statementLineRows(
  lines: StatementLine[],
): Prisma.StatementLineUncheckedCreateWithoutStatementInput[] {
  return lines.map((line, position) => {
    const details = line.meters?.map((m): StatementLineDetail => ({
      meterId: m.meterId,
      utility: m.utility,
      label: m.label,
      serialNumber: m.serialNumber,
      consumption: m.consumption.toFixed(3),
      photoIds: m.photoIds,
    }));
    return {
      position,
      type: line.type,
      tariffId: line.tariffId,
      name: line.name,
      utilities: line.utilities ?? [],
      zone: line.zone,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      amount: line.amount,
      details: details as unknown as Prisma.InputJsonArray | undefined,
    };
  });
}
