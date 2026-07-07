import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { LOCKOUT_ATTEMPTS, LOCKOUT_DURATION_MS, throttleDelayMs, TRIVIAL_PINS } from './constants';

type Db = PrismaClient | Prisma.TransactionClient;

export function hashPin(pin: string): string {
  return createHash('sha256').update(`qm-pilot-pin:${pin}`).digest('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function validatePinFormat(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return 'PIN muss genau 4 Ziffern haben.';
  if (TRIVIAL_PINS.has(pin)) return 'Diese PIN ist zu einfach. Bitte wählen Sie eine andere.';
  return null;
}

export function isPinLocked(pinLockedUntil: Date | null | undefined, now = new Date()): boolean {
  return !!pinLockedUntil && pinLockedUntil > now;
}

export function lockoutUntil(now = new Date()): Date {
  return new Date(now.getTime() + LOCKOUT_DURATION_MS);
}

export interface PinAttemptResult {
  ok: boolean;
  locked: boolean;
  pinLockedUntil: Date | null;
  failedAttempts: number;
  throttleMs: number;
}

export async function verifyPinCredential(
  db: Db,
  userId: string,
  pin: string,
  options: { recordFailure?: boolean; resetOnSuccess?: boolean } = {},
): Promise<PinAttemptResult> {
  const { recordFailure = true, resetOnSuccess = true } = options;
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { pinHash: true, pinFailedAttempts: true, pinLockedUntil: true, status: true },
  });

  if (user.status === 'retired' || !user.pinHash) {
    return { ok: false, locked: true, pinLockedUntil: user.pinLockedUntil, failedAttempts: user.pinFailedAttempts, throttleMs: 0 };
  }

  const now = new Date();
  if (isPinLocked(user.pinLockedUntil, now)) {
    return { ok: false, locked: true, pinLockedUntil: user.pinLockedUntil, failedAttempts: user.pinFailedAttempts, throttleMs: 0 };
  }

  const candidate = Buffer.from(hashPin(pin));
  const stored = Buffer.from(user.pinHash);
  const matches = candidate.length === stored.length && timingSafeEqual(candidate, stored);

  if (matches) {
    if (resetOnSuccess && (user.pinFailedAttempts > 0 || user.pinLockedUntil)) {
      await db.user.update({
        where: { id: userId },
        data: { pinFailedAttempts: 0, pinLockedUntil: null },
      });
    }
    return { ok: true, locked: false, pinLockedUntil: null, failedAttempts: 0, throttleMs: 0 };
  }

  if (!recordFailure) {
    return { ok: false, locked: false, pinLockedUntil: null, failedAttempts: user.pinFailedAttempts, throttleMs: 0 };
  }

  const nextAttempts = user.pinFailedAttempts + 1;
  const locked = nextAttempts >= LOCKOUT_ATTEMPTS;
  const pinLockedUntil = locked ? lockoutUntil(now) : null;
  await db.user.update({
    where: { id: userId },
    data: { pinFailedAttempts: nextAttempts, pinLockedUntil },
  });

  return {
    ok: false,
    locked,
    pinLockedUntil,
    failedAttempts: nextAttempts,
    throttleMs: throttleDelayMs(nextAttempts),
  };
}

export async function setUserPin(db: Db, userId: string, pin: string): Promise<void> {
  const formatError = validatePinFormat(pin);
  if (formatError) throw new Error(formatError);
  await db.user.update({
    where: { id: userId },
    data: { pinHash: hashPin(pin), pinFailedAttempts: 0, pinLockedUntil: null },
  });
}
