import { ApiProperty } from '@nestjs/swagger';

export class TenantApartmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Shevchenka 12/5' })
  name: string;
}
