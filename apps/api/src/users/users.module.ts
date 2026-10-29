import { Module } from '@nestjs/common';
import { PasswordService } from './password.service.js';
import { UsersService } from './users.service.js';

// PasswordService lives here rather than in auth: users needs hash() (create/reset), auth needs
// verify() and imports UsersModule anyway — keeping it here avoids an auth ↔ users cycle.
@Module({
  providers: [PasswordService, UsersService],
  exports: [PasswordService, UsersService],
})
export class UsersModule {}
