import { ApiProperty } from '@nestjs/swagger';
import { Apartment } from '../../generated/prisma/client.js';

export class ApartmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Shevchenka 12/5' })
  name: string;

  @ApiProperty({ example: 'Kyiv, Shevchenka St 12, apt 5' })
  address: string;

  @ApiProperty({ type: String, nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'false = archived' })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(a: Apartment): ApartmentResponseDto {
    return {
      id: a.id,
      name: a.name,
      address: a.address,
      notes: a.notes,
      isActive: a.isActive,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }
}
