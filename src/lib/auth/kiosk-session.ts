import type { PrismaClient } from '@prisma/client';
import type { APIContext } from 'astro';
import { generateToken, hashToken } from './pin';
import { KIOSK_SESSION_COOKIE } from './constants';
import { kioskExpiryFromNow } from './sessions';
import { verifyPinCredential } from './pin';
import { writeAuthAuditEvent } from './audit';
import type { AuditEventContext } from '../audit/types';

export function kioskSessionCookieOptions(token: string, secure: boolean, maxAgeSeconds: number) {
  return {
    name: KIOSK_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export async function createKioskSession(
  db: PrismaClient,
  input: {
    tenantId: string;
    userId: string;
    kioskDeviceId: string;
    autoLockSeconds: number;
    context?: AuditEventContext;
  },
): Promise<string> {
  await db.kioskSession.deleteMany({ where: { userId: input.userId, kioskDeviceId: input.kioskDeviceId } });
  const token = generateToken();
  const expiresAt = kioskExpiryFromNow(input.autoLockSeconds);
  await db.kioskSession.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      kioskDeviceId: input.kioskDeviceId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });
  await writeAuthAuditEvent(
    db,
    input.tenantId,
    input.userId,
    { action: 'auth.login', actionLabel: 'Kiosk-Anmeldung', diff: { method: { old: null, new: 'pin' } } },
    { ...input.context, kioskDeviceId: input.kioskDeviceId },
  );
  return token;
}

export async function endKioskSession(
  db: PrismaClient,
  cookies: APIContext['cookies'],
  context?: AuditEventContext,
): Promise<void> {
  const token = cookies.get(KIOSK_SESSION_COOKIE)?.value;
  if (!token) return;
  const session = await db.kioskSession.findFirst({
    where: { tokenHash: hashToken(token) },
  });
  if (session) {
    await db.kioskSession.delete({ where: { id: session.id } });
    await writeAuthAuditEvent(
      db,
      session.tenantId,
      session.userId,
      { action: 'auth.logout', actionLabel: 'Kiosk-Abmeldung' },
      { ...context, kioskDeviceId: session.kioskDeviceId, sessionId: session.id },
    );
  }
  cookies.delete(KIOSK_SESSION_COOKIE, { path: '/' });
}

export async function attemptKioskPinLogin(
  db: PrismaClient,
  input: {
    userId: string;
    tenantId: string;
    kioskDeviceId: string;
    pin: string;
    autoLockSeconds: number;
    context?: AuditEventContext;
  },
): Promise<{ ok: true; token: string } | { ok: false; locked: boolean; pinLockedUntil: Date | null; throttleMs: number; failedAttempts: number }> {
  const user = await db.user.findFirst({
    where: { id: input.userId, tenantId: input.tenantId, status: 'active', pinHash: { not: null } },
    include: { roles: { where: { key: 'external' } } },
  });
  if (!user || user.roles.length === 0) {
    return { ok: false, locked: false, pinLockedUntil: null, throttleMs: 0, failedAttempts: 0 };
  }

  const result = await verifyPinCredential(db, input.userId, input.pin);
  if (!result.ok) {
    const action = result.locked ? 'auth.pinLocked' : 'auth.loginFailed';
    const actionLabel = result.locked ? 'PIN gesperrt' : 'Kiosk-Anmeldung fehlgeschlagen';
    await writeAuthAuditEvent(
      db,
      input.tenantId,
      input.userId,
      {
        action,
        actionLabel,
        diff: { method: { old: null, new: 'pin' }, failedAttempts: { old: null, new: result.failedAttempts } },
        severity: result.locked ? 'warning' : 'info',
      },
      { ...input.context, kioskDeviceId: input.kioskDeviceId },
    );
    return {
      ok: false,
      locked: result.locked,
      pinLockedUntil: result.pinLockedUntil,
      throttleMs: result.throttleMs,
      failedAttempts: result.failedAttempts,
    };
  }

  const token = await createKioskSession(db, input);
  return { ok: true, token };
}
