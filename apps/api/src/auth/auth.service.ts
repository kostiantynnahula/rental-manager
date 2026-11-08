import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../generated/prisma/client.js';
import { UserKind } from '../generated/prisma/enums.js';
import { PasswordService } from '../users/password.service.js';
import { UsersService } from '../users/users.service.js';
import type { AuthTokens } from './interfaces/auth-tokens.interface.js';
import { SessionsService } from './sessions.service.js';

@Injectable()
export class AuthService {
  // Verified against when the email is unknown, so both failure paths cost one argon2 run
  // and response time doesn't reveal which emails exist.
  private dummyHash?: Promise<string>;

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsService,
    private readonly jwt: JwtService,
  ) {}

  async login(
    email: string,
    password: string,
    userAgent: string | undefined,
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const user = await this.users.findByEmail(email);
    // Service users have no password (they use API keys): verify against the dummy hash like an
    // unknown email, so every failure path costs the same.
    const isHuman = user?.kind === UserKind.HUMAN;
    const passwordHash = isHuman ? user.passwordHash : null;
    const valid = await this.passwords.verify(
      passwordHash ?? (await this.getDummyHash()),
      password,
    );
    // One message for unknown email, service user, wrong password and inactive user.
    if (!user || !isHuman || !passwordHash || !valid || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const refreshToken = await this.sessions.create(user.id, userAgent);
    return { user, tokens: { accessToken: await this.signAccess(user.id), refreshToken } };
  }

  async refresh(refreshToken: string, userAgent: string | undefined): Promise<AuthTokens> {
    const { userId, token } = await this.sessions.rotate(refreshToken, userAgent);
    return { accessToken: await this.signAccess(userId), refreshToken: token };
  }

  logout(refreshToken: string): Promise<void> {
    return this.sessions.revoke(refreshToken);
  }

  // expiresIn comes from JwtModule's signOptions (JWT_ACCESS_TTL_SECONDS).
  private signAccess(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId });
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.passwords.hash('dummy-password-for-timing');
    return this.dummyHash;
  }
}
