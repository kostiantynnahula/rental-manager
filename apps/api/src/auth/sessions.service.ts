import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.validation.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReuseError } from './errors/reuse.error.js';
import { generateRefreshToken, hashRefreshToken } from './helpers/refresh-token.js';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // Returns the raw token: the only moment it exists outside the client's cookie.
  async create(userId: string, userAgent: string | undefined): Promise<string> {
    const token = generateRefreshToken();
    await this.prisma.session.create({
      data: { userId, tokenHash: hashRefreshToken(token), expiresAt: this.expiresAt(), userAgent },
    });
    return token;
  }

  // Exchanges a refresh token for a new one. Presenting an already-revoked token means it
  // leaked (or a race between tabs): revoke every session of that user.
  async rotate(
    token: string,
    userAgent: string | undefined,
  ): Promise<{ userId: string; token: string }> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashRefreshToken(token) },
      include: { user: { select: { isActive: true } } },
    });
    if (!session || session.expiresAt <= new Date()) throw new UnauthorizedException();
    if (session.revokedAt) return this.reuseDetected(session.userId);
    if (!session.user.isActive) throw new UnauthorizedException();

    const newToken = generateRefreshToken();
    const now = new Date();
    const rotated = await this.prisma
      .$transaction(async (tx) => {
        const next = await tx.session.create({
          data: {
            userId: session.userId,
            tokenHash: hashRefreshToken(newToken),
            expiresAt: this.expiresAt(),
            userAgent,
          },
        });
        // Conditional update: if a concurrent request already rotated this session, count is 0.
        const { count } = await tx.session.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: now, replacedById: next.id, lastUsedAt: now },
        });
        if (count === 0) throw new ReuseError();
        return next;
      })
      .catch((e: unknown) => {
        if (e instanceof ReuseError) return null;
        throw e;
      });
    if (!rotated) return this.reuseDetected(session.userId);

    return { userId: session.userId, token: newToken };
  }

  // Logout: unknown or already-revoked tokens are ignored (logout is idempotent).
  async revoke(token: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash: hashRefreshToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(userId: string): Promise<number> {
    const { count } = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return count;
  }

  private async reuseDetected(userId: string): Promise<never> {
    const count = await this.revokeAll(userId);
    this.logger.warn(`Refresh token reuse for user ${userId}: revoked ${count} session(s)`);
    throw new UnauthorizedException();
  }

  private expiresAt(): Date {
    const days = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
