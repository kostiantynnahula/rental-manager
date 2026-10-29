import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../generated/prisma/client.js';

// Public view of a User: never includes passwordHash.
export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'owner@example.com' })
  email: string;

  @ApiProperty({ type: String, nullable: true, example: 'Owner' })
  name: string | null;

  static from(user: User): UserResponseDto {
    return { id: user.id, email: user.email, name: user.name };
  }
}
