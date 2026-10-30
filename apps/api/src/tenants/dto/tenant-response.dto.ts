import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../generated/prisma/client.js';

export class TenantResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Ivan Petrenko' })
  fullName: string;

  @ApiProperty({ example: '+380501112233' })
  phone: string;

  @ApiProperty({ type: String, nullable: true })
  email: string | null;

  @ApiProperty({ type: String, nullable: true })
  notes: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(t: Tenant): TenantResponseDto {
    return {
      id: t.id,
      fullName: t.fullName,
      phone: t.phone,
      email: t.email,
      notes: t.notes,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }
}
