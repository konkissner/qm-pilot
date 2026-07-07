import type { PrismaClient } from '@prisma/client';
import { ABSOLUTE_SESSION_MAX_MS } from './constants';

export async function revokeAllUserSessions(db: PrismaClient, userId: string): Promise<number> {
  const [auth, kiosk] = await Promise.all([
    db.authSession.deleteMany({ where: { userId } }),
    db.kioskSession.deleteMany({ where: { userId } }),
  ]);
  return auth.count + kiosk.count;
}

export function isSessionExpired(
  expiresAt: Date,
  createdAt: Date,
  inactivityLimitMs: number,
  lastActiveAt?: Date,
  now = new Date(),
): 'ok' | 'inactivity' | 'absolute' {
  if (now.getTime() - createdAt.getTime() > ABSOLUTE_SESSION_MAX_MS) return 'absolute';
  const reference = lastActiveAt ?? expiresAt;
  if (reference.getTime() < now.getTime()) return 'inactivity';
  if (expiresAt.getTime() < now.getTime()) return 'inactivity';
  if (lastActiveAt && now.getTime() - lastActiveAt.getTime() > inactivityLimitMs) return 'inactivity';
  return 'ok';
}

export function sessionExpiryFromNow(timeoutMinutes: number, now = new Date()): Date {
  return new Date(now.getTime() + timeoutMinutes * 60_000);
}

export function kioskExpiryFromNow(autoLockSeconds: number, now = new Date()): Date {
  return new Date(now.getTime() + autoLockSeconds * 1000);
}
