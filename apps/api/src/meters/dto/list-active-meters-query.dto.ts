import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

// Only the active list for now; other filters can be added later without breaking clients.
export class ListActiveMetersQueryDto {
  @ApiProperty({
    enum: ['true'],
    description: 'true = installed, not removed meters of active (not archived) apartments',
  })
  @IsIn(['true'])
  active: 'true';
}
