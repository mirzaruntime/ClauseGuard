import bcrypt from 'bcryptjs';
import { env } from '../config/env';

/** Hashes a plaintext password. Plaintext passwords are never persisted or logged. */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, env.BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  if (!passwordHash) return false;
  return bcrypt.compare(plainPassword, passwordHash);
}
