import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';

// Adds the new tenant as CONTACT to a lease that covers today.
export class AddContactAssignmentDto {
  @ApiProperty({ enum: ['ADD_CONTACT'] })
  @IsIn(['ADD_CONTACT'])
  mode: 'ADD_CONTACT';

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  leaseId: string;
}
