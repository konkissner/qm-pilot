import type { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { auditedMutation, loadUserNameSnapshot } from '../audit/audited';
import type { AuditEventContext } from '../audit/types';
import { hashToken, generateToken } from './pin';
import { KIOSK_DEVICE_COOKIE } from './constants';

export async function registerKioskDevice(
  db: PrismaClient,
  actor: { id: string; tenantId: string },
  name: string,
  auditContext?: AuditEventContext,
): Promise<{ deviceId: string; token: string }> {
  const token = generateToken();
  const device = await auditedMutation(
    db,
    {
      tenantId: actor.tenantId,
      userId: actor.id,
      userNameSnapshot: await loadUserNameSnapshot(db, actor.id),
      context: auditContext,
    },
    async (tx) => {
      const created = await tx.kioskDevice.create({
        data: {
          tenantId: actor.tenantId,
          name,
          deviceTokenHash: hashToken(token),
          registeredById: actor.id,
        },
      });
      return {
        result: created,
        event: {
          action: 'kioskDevice.registered',
          actionLabel: 'Kiosk-Gerät registriert',
          objectType: 'KioskDevice',
          objectId: created.id,
          objectLabel: name,
        },
      };
    },
  );

  return { deviceId: device.id, token };
}

export function kioskDeviceCookieOptions(token: string, secure: boolean) {
  return {
    name: KIOSK_DEVICE_COOKIE,
    value: token,
    httpOnly: true,
    secure,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 365 * 5,
  };
}

export async function revokeKioskDevice(
  db: PrismaClient,
  actor: { id: string; tenantId: string },
  deviceId: string,
  auditContext?: AuditEventContext,
): Promise<void> {
  await auditedMutation(
    db,
    {
      tenantId: actor.tenantId,
      userId: actor.id,
      userNameSnapshot: await loadUserNameSnapshot(db, actor.id),
      context: auditContext,
    },
    async (tx) => {
      const device = await tx.kioskDevice.update({
        where: { id: deviceId },
        data: { status: 'revoked' },
      });
      await tx.kioskSession.deleteMany({ where: { kioskDeviceId: deviceId } });
      return {
        result: device,
        event: {
          action: 'kioskDevice.revoked',
          actionLabel: 'Kiosk-Gerät widerrufen',
          objectType: 'KioskDevice',
          objectId: device.id,
          objectLabel: device.name,
        },
      };
    },
  );
}

export function randomInitialPassword(): string {
  const part = randomBytes(9).toString('base64url');
  return `Qm!${part}9a`;
}
