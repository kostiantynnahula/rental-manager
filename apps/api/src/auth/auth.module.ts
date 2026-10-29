import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { jwtModuleOptionsFromConfig } from './config/jwt.config.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { SessionsService } from './sessions.service.js';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({ inject: [ConfigService], useFactory: jwtModuleOptionsFromConfig }),
    // Default limit for routes behind ThrottlerGuard (only AuthController so far);
    // login/refresh override it with @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionsService,
    // Registered here (not in main.ts) so e2e tests that import AppModule get it too.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
