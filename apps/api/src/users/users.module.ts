import { Module } from '@nestjs/common';
import { PasswordService } from './password.service.js';

// Lives here rather than in auth: users needs hash() (create/reset), auth needs verify()
// and will import UsersModule anyway — keeping it here avoids an auth ↔ users cycle.
@Module({
  providers: [PasswordService],
  exports: [PasswordService],
})
export class UsersModule {}
