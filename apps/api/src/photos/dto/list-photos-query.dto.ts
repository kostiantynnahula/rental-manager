import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

// Only the inbox list for now; other filters can be added later without breaking clients.
export class ListPhotosQueryDto {
  @ApiProperty({ enum: ['true'], description: 'true = photos without an apartment (inbox)' })
  @IsIn(['true'])
  inbox: 'true';
}
