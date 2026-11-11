import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { StatementLine as StatementLineRow } from '../../generated/prisma/client.js';
import { StatementLineType, UtilityType, Zone } from '../../generated/prisma/enums.js';
import type { StatementLineDetail } from '../interfaces/statement-line-detail.interface.js';
import type { StatementLine } from '../interfaces/statement-line.interface.js';
import { StatementLineMeterResponseDto } from './statement-line-meter-response.dto.js';

export class StatementLineResponseDto {
  @ApiProperty({ enum: StatementLineType, enumName: 'StatementLineType' })
  type: StatementLineType;

  @ApiPropertyOptional({ format: 'uuid', description: 'All but RENT' })
  tariffId?: string;

  @ApiProperty({ example: 'Електроенергія' })
  name: string;

  @ApiPropertyOptional({ enum: Zone, enumName: 'Zone', description: 'METERED only' })
  zone?: Zone;

  @ApiPropertyOptional({
    enum: UtilityType,
    enumName: 'UtilityType',
    isArray: true,
    description: 'METERED only',
  })
  utilities?: UtilityType[];

  @ApiPropertyOptional({
    example: '200.000',
    description: 'Decimal string with 3 decimals; absent for MANUAL (amount only)',
  })
  quantity?: string;

  @ApiPropertyOptional({
    example: '4.3200',
    description: 'UAH, decimal string with 4 decimals; absent for MANUAL (amount only)',
  })
  unitPrice?: string;

  @ApiProperty({ example: 86400, description: 'Integer kopiyky' })
  amount: number;

  @ApiPropertyOptional({
    type: [StatementLineMeterResponseDto],
    description: 'METERED only: what each meter contributed',
  })
  meters?: StatementLineMeterResponseDto[];

  static from(l: StatementLine): StatementLineResponseDto {
    return {
      type: l.type,
      tariffId: l.tariffId,
      name: l.name,
      zone: l.zone,
      utilities: l.utilities,
      quantity: l.quantity?.toFixed(3),
      unitPrice: l.unitPrice?.toFixed(4),
      amount: l.amount,
      meters: l.meters?.map((m) => StatementLineMeterResponseDto.from(m)),
    };
  }

  // A saved line in the preview's shape, so one client component can show both.
  static fromRow(l: StatementLineRow): StatementLineResponseDto {
    return {
      type: l.type,
      tariffId: l.tariffId ?? undefined,
      name: l.name,
      zone: l.zone ?? undefined,
      utilities: l.utilities.length > 0 ? l.utilities : undefined,
      quantity: l.quantity?.toFixed(3),
      unitPrice: l.unitPrice?.toFixed(4),
      amount: l.amount,
      meters: (l.details as unknown as StatementLineDetail[] | null)?.map((d) =>
        StatementLineMeterResponseDto.fromDetail(d),
      ),
    };
  }
}
