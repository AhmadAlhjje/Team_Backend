import { Injectable, type OnModuleInit } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';

import { hashPassword, PASSWORD_HASH_OPTIONS } from './password-hashing.js';

@Injectable()
export class PasswordService implements OnModuleInit {
  private dummyHash = '';

  async onModuleInit(): Promise<void> {
    // Used to spend the same time on unknown emails as on wrong passwords,
    // so response timing does not reveal which accounts exist.
    this.dummyHash = await this.hash(randomBytes(16).toString('hex'));
  }

  hash(password: string): Promise<string> {
    return hashPassword(password);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /** Burns the same CPU time as a real verification and always fails. */
  async verifyDummy(password: string): Promise<false> {
    if (this.dummyHash) await this.verify(this.dummyHash, password);
    return false;
  }

  needsRehash(hash: string): boolean {
    return argon2.needsRehash(hash, PASSWORD_HASH_OPTIONS);
  }
}
