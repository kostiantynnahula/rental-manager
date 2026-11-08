import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ApiKey, Prisma } from '../generated/prisma/client.js';
import { UserKind } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { API_KEY_PREFIX, SERVICE_EMAIL_DOMAIN } from './constants/api-key-format.js';
import { generateApiKey, hashApiKey } from './helpers/api-key-token.js';
import type { CreateApiKeyInput } from './interfaces/create-api-key-input.interface.js';
import type { VerifiedApiKey } from './interfaces/verified-api-key.interface.js';

// Becomes the email local part, so keep it to a safe, already-normalized charset.
const SERVICE_NAME = /^[a-z0-9-]+$/;

type ApiKeyWithUser = Prisma.ApiKeyGetPayload<{
  include: { user: { select: { email: true; isActive: true } } };
}>;

// Never log a full key: the prefix is enough to identify one.
@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  // The returned `key` is the only time the full key exists; only its hash is stored.
  async create({
    service,
    name,
    scopes,
  }: CreateApiKeyInput): Promise<{ key: string; apiKey: ApiKey }> {
    if (!SERVICE_NAME.test(service)) {
      throw new BadRequestException('Service name may contain only a-z, 0-9 and "-"');
    }
    const email = `${service}@${SERVICE_EMAIL_DOMAIN}`;
    const { key, prefix } = generateApiKey();
    const apiKey = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email },
        create: { email, name: service, kind: UserKind.SERVICE, passwordHash: null },
        update: {},
      });
      if (user.kind !== UserKind.SERVICE) {
        throw new ConflictException(`${email} is not a service user`);
      }
      return tx.apiKey.create({
        data: { userId: user.id, name, prefix, keyHash: hashApiKey(key), scopes },
      });
    });
    return { key, apiKey };
  }

  list(): Promise<ApiKeyWithUser[]> {
    return this.prisma.apiKey.findMany({
      include: { user: { select: { email: true, isActive: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(prefix: string): Promise<void> {
    const { count } = await this.prisma.apiKey.updateMany({
      where: { prefix, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count > 0) return;
    const existing = await this.prisma.apiKey.findUnique({ where: { prefix } });
    if (!existing) throw new NotFoundException(`API key ${prefix} not found`);
    throw new ConflictException(`API key ${prefix} is already revoked`);
  }

  // null for anything that must not authenticate: not a key, unknown, revoked, inactive or non-service user.
  async verify(token: string): Promise<VerifiedApiKey | null> {
    if (!token.startsWith(API_KEY_PREFIX)) return null;
    const found = await this.prisma.apiKey.findUnique({
      where: { keyHash: hashApiKey(token) },
      include: { user: true },
    });
    if (!found || found.revokedAt || !found.user.isActive || found.user.kind !== UserKind.SERVICE) {
      return null;
    }
    const { user, ...apiKey } = found;
    return { apiKey, user };
  }
}
