import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

// A human sorts a photo (e.g. an inbox photo the worker couldn't match) into an apartment.
export class AssignPhotoApartmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  apartmentId: string;
}
