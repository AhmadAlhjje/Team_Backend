import * as argon2 from 'argon2';

/**
 * OWASP-recommended Argon2id parameters (19 MiB memory, 2 iterations).
 * Framework-free so the seed scripts can reuse them.
 */
export const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, PASSWORD_HASH_OPTIONS);
}
