import { Injectable } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';

// argon2id with the library's defaults (OWASP-recommended cost). No dependencies,
// so scripts like prisma/seed.ts can use it with `new PasswordService()`.
@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return hash(plain, { type: argon2id });
  }

  async verify(hashed: string, plain: string): Promise<boolean> {
    try {
      return await verify(hashed, plain);
    } catch {
      // Malformed hash: treat as a failed check, not a server error.
      return false;
    }
  }
}
