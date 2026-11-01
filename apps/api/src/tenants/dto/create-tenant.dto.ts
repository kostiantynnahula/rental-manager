import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IsUaPhone } from '../validators/is-ua-phone.decorator.js';
import { AddContactAssignmentDto } from './add-contact-assignment.dto.js';
import { NewLeaseAssignmentDto } from './new-lease-assignment.dto.js';
import { TenantAssignmentDto } from './tenant-assignment.dto.js';

@ApiExtraModels(NewLeaseAssignmentDto, AddContactAssignmentDto)
export class CreateTenantDto {
  @ApiProperty({ example: 'Ivan Petrenko' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName: string;

  @ApiProperty({
    example: '067 123 45 67',
    description: 'Ukrainian number in any common format; stored as +380XXXXXXXXX',
  })
  @IsUaPhone()
  phone: string;

  // null clears it on PATCH.
  @ApiPropertyOptional({ type: String, nullable: true, example: 'ivan@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;

  // The client picks the mode explicitly; the server never infers it from the apartment's state.
  @ApiPropertyOptional({
    description:
      'Optional, in the same transaction: NEW_LEASE creates a lease with this tenant as PRIMARY; ADD_CONTACT adds ' +
      'them as CONTACT to a current lease',
    oneOf: [
      { $ref: getSchemaPath(NewLeaseAssignmentDto) },
      { $ref: getSchemaPath(AddContactAssignmentDto) },
    ],
    discriminator: {
      propertyName: 'mode',
      mapping: {
        NEW_LEASE: getSchemaPath(NewLeaseAssignmentDto),
        ADD_CONTACT: getSchemaPath(AddContactAssignmentDto),
      },
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TenantAssignmentDto, {
    discriminator: {
      property: 'mode',
      subTypes: [
        { name: 'NEW_LEASE', value: NewLeaseAssignmentDto },
        { name: 'ADD_CONTACT', value: AddContactAssignmentDto },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  assignment?: NewLeaseAssignmentDto | AddContactAssignmentDto;
}
