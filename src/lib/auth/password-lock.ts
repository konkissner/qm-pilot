import type { Prisma, PrismaClient } from '@prisma/client';
import { LOCKOUT_ATTEMPTS, LOCKOUT_DURATION_MS, throttleDelayMs } from './constants';
import { isPinLocked, lockoutUntil } from './pin';

type Db = PrismaClient | Prisma.TransactionClient;

export interface PasswordAttemptResult {
  allowed: boolean;
  locked: boolean;
  passwordLockedUntil: Date | null;
  failedAttempts: number;
  throttleMs: number;
}

export async function checkPasswordLock(
  db: Db,
  userId: string,
  now = new Date(),
): Promise<PasswordAttemptResult> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordFailedAttempts: true, passwordLockedUntil: true, status: true },
  });

  if (user.status === 'retired') {
    return { allowed: false, locked: true, passwordLockedUntil: user.passwordLockedUntil, failedAttempts: user.passwordFailedAttempts, throttleMs: 0 };
  }

  if (isPinLocked(user.passwordLockedUntil, now)) {
    return { allowed: false, locked: true, passwordLockedUntil: user.passwordLockedUntil, failedAttempts: user.passwordFailedAttempts, throttleMs: 0 };
  }

  return { allowed: true, locked: false, passwordLockedUntil: null, failedAttempts: user.passwordFailedAttempts, throttleMs: 0 };
}

export async function recordPasswordFailure(db: Db, userId: string, now = new Date()): Promise<PasswordAttemptResult> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordFailedAttempts: true },
  });
  const nextAttempts = user.passwordFailedAttempts + 1;
  const locked = nextAttempts >= LOCKOUT_ATTEMPTS;
  const passwordLockedUntil = locked ? lockoutUntil(now) : null;
  await db.user.update({
    where: { id: userId },
    data: { passwordFailedAttempts: nextAttempts, passwordLockedUntil },
  });
  return {
    allowed: false,
    locked,
    passwordLockedUntil,
    failedAttempts: nextAttempts,
    throttleMs: throttleDelayMs(nextAttempts),
  };
}

export async function resetPasswordFailures(db: Db, userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { passwordFailedAttempts: 0, passwordLockedUntil: null },
  });
}

export function isPasswordLocked(passwordLockedUntil: Date | null | undefined, now = new Date()): boolean {
  return isPinLocked(passwordLockedUntil, now);
}

export const PASSWORD_LOCKOUT_MS = LOCKOUT_DURATION_MS;
