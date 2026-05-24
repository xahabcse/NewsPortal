// bcryptjs wrapper — matches the legacy PasswordHelper in NewsPortal.Core.Helpers.
// bcryptjs runs in Workers (pure JS, no native deps).

import bcrypt from 'bcryptjs';

const ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
