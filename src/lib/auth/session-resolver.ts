import type { PrismaClient } from '@prisma/client';
import type { APIContext } from 'astro';
import { fromNodeHeaders } from 'better-auth/node';
import {
  auditorDefaultVisibleModules,
  getEffectivePermissions,
  type EffectivePermissions,
  type InputRightKey,
  type ModuleKey,
  type RoleKey,
} from '../permissions';
import { getAuthForTenant } from './config';
import { hashToken } from './pin';
import { isSessionExpired } from './sessions';
import { isAuditorInviteActive, nextAuditorInviteStatus } from './auditor-window';
import { KIOSK_DEVICE_COOKIE, KIOSK_SESSION_COOKIE } from './constants';
import { writeAuthAuditEvent } from './audit';
import type { AuditEventContext } from '../audit/types';

export interface AppUser {
  id: string;
  tenantId: string;
  email: string | null;
  firstName: string;
  lastName: string;
  name: string;
  status: 'active' | 'retired';
  roleKeys: RoleKey[];
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
  isAuditor: boolean;
  isKiosk: boolean;
}

export interface AppSession {
  kind: 'standard' | 'kiosk';
  sessionId: string;
  user: AppUser;
  permissions: EffectivePermissions;
  kioskDeviceId?: string;
  auditorInviteId?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface ResolveSessionOptions {
  ip?: string;
  userAgent?: string;
  cookies: APIContext['cookies'];
  headers: Headers;
}

async function loadPermissions(
  db: PrismaClient,
  userId: string,
  tenantId: string,
  roleKeys: RoleKey[],
  auditorInvite?: { id: string; visibleModules: string[] } | null,
): Promise<EffectivePermissions> {
  const [roleRights, userRights] = await Promise.all([
    db.roleRight.findMany({ where: { tenantId }, include: { role: { select: { key: true } } } }),
    db.userRight.findMany({ where: { userId } }),
  ]);

  return getEffectivePermissions(
    { roleKeys },
    roleRights.map((rr) => ({
      roleKey: rr.role.key as RoleKey,
      kind: rr.kind as 'module' | 'input',
      rightKey: rr.rightKey,
      allowed: rr.allowed,
    })),
    userRights.map((ur) => ({
      kind: ur.kind as 'module' | 'input',
      rightKey: ur.rightKey,
      allowed: ur.allowed,
    })),
    auditorInvite
      ? { visibleModules: auditorInvite.visibleModules as ModuleKey[] }
      : roleKeys.includes('auditor')
        ? { visibleModules: auditorDefaultVisibleModules() }
        : undefined,
  );
}

function toAppUser(
  user: {
    id: string;
    tenantId: string;
    email: string | null;
    firstName: string;
    lastName: string;
    name: string;
    status: 'active' | 'retired';
    mustChangePassword: boolean;
    twoFactorEnabled: boolean;
    roles: { key: string }[];
  },
  kind: 'standard' | 'kiosk',
): AppUser {
  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name,
    status: user.status,
    roleKeys: user.roles.map((r) => r.key as RoleKey),
    mustChangePassword: user.mustChangePassword,
    twoFactorEnabled: user.twoFactorEnabled,
    isAuditor: user.roles.some((r) => r.key === 'auditor'),
    isKiosk: kind === 'kiosk',
  };
}

export async function resolveKioskDevice(
  db: PrismaClient,
  cookies: APIContext['cookies'],
): Promise<{ id: string; tenantId: string; name: string } | null> {
  const token = cookies.get(KIOSK_DEVICE_COOKIE)?.value;
  if (!token) return null;
  const device = await db.kioskDevice.findFirst({
    where: { deviceTokenHash: hashToken(token), status: 'active' },
    select: { id: true, tenantId: true, name: true },
  });
  return device;
}

export async function resolveAppSession(
  db: PrismaClient,
  options: ResolveSessionOptions,
): Promise<AppSession | null> {
  const auditContext: AuditEventContext = {
    ip: options.ip,
    userAgent: options.userAgent,
  };

  const kioskToken = options.cookies.get(KIOSK_SESSION_COOKIE)?.value;
  if (kioskToken) {
    const kioskSession = await db.kioskSession.findFirst({
      where: { tokenHash: hashToken(kioskToken) },
      include: {
        user: { include: { roles: true } },
        kioskDevice: true,
      },
    });
    if (!kioskSession || kioskSession.kioskDevice.status !== 'active') {
      options.cookies.delete(KIOSK_SESSION_COOKIE, { path: '/' });
      return null;
    }

    const tenantConfig = await db.tenantConfig.findUniqueOrThrow({
      where: { tenantId: kioskSession.tenantId },
    });
    const expiry = isSessionExpired(
      kioskSession.expiresAt,
      kioskSession.createdAt,
      tenantConfig.kioskAutoLockSeconds * 1000,
      kioskSession.lastActiveAt,
    );
    if (kioskSession.user.status === 'retired' || expiry !== 'ok') {
      await db.kioskSession.delete({ where: { id: kioskSession.id } });
      options.cookies.delete(KIOSK_SESSION_COOKIE, { path: '/' });
      if (expiry !== 'ok') {
        await writeAuthAuditEvent(db, kioskSession.tenantId, kioskSession.userId, {
          action: 'auth.sessionExpired',
          actionLabel: 'Kiosk-Session abgelaufen',
        }, { ...auditContext, kioskDeviceId: kioskSession.kioskDeviceId, sessionId: kioskSession.id });
      }
      return null;
    }

    const newExpiry = new Date(Date.now() + tenantConfig.kioskAutoLockSeconds * 1000);
    await db.kioskSession.update({
      where: { id: kioskSession.id },
      data: { lastActiveAt: new Date(), expiresAt: newExpiry },
    });

    const permissions = await loadPermissions(db, kioskSession.userId, kioskSession.tenantId, kioskSession.user.roles.map((r) => r.key as RoleKey));
    return {
      kind: 'kiosk',
      sessionId: kioskSession.id,
      kioskDeviceId: kioskSession.kioskDeviceId,
      user: toAppUser(kioskSession.user, 'kiosk'),
      permissions,
      expiresAt: newExpiry,
      createdAt: kioskSession.createdAt,
    };
  }

  const auth = await getAuthForTenant(db);
  const baSession = await auth.api.getSession({ headers: fromNodeHeaders(Object.fromEntries(options.headers.entries())) });
  if (!baSession?.user) return null;

  const userId = baSession.user.id;
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { roles: true, auditorInvite: true },
  });
  if (!user || user.status === 'retired') {
    await db.authSession.deleteMany({ where: { userId } });
    return null;
  }

  if (user.auditorInvite) {
    const nextStatus = nextAuditorInviteStatus(
      user.auditorInvite.validFrom,
      user.auditorInvite.validUntil,
      user.auditorInvite.status,
    );
    if (nextStatus === 'expired' && user.auditorInvite.status !== 'expired') {
      await db.auditorInvite.update({ where: { id: user.auditorInvite.id }, data: { status: 'expired' } });
      await db.user.update({ where: { id: user.id }, data: { status: 'retired', retiredAt: new Date() } });
      await db.authSession.deleteMany({ where: { userId } });
      return null;
    }
    if (!isAuditorInviteActive(user.auditorInvite.validFrom, user.auditorInvite.validUntil, user.auditorInvite.status)) {
      return null;
    }
  }

  const tenantConfig = await db.tenantConfig.findUniqueOrThrow({ where: { tenantId: user.tenantId } });
  const authSession = await db.authSession.findFirst({ where: { userId, token: baSession.session.token } });
  if (!authSession) return null;

  const expiry = isSessionExpired(
    authSession.expiresAt,
    authSession.createdAt,
    tenantConfig.sessionTimeoutMinutes * 60_000,
  );
  if (expiry !== 'ok') {
    await db.authSession.delete({ where: { id: authSession.id } });
    await writeAuthAuditEvent(db, user.tenantId, user.id, {
      action: expiry === 'absolute' ? 'auth.sessionExpired' : 'auth.sessionExpired',
      actionLabel: 'Session abgelaufen',
    }, { ...auditContext, sessionId: authSession.id });
    return null;
  }

  const permissions = await loadPermissions(
    db,
    user.id,
    user.tenantId,
    user.roles.map((r) => r.key as RoleKey),
    user.auditorInvite,
  );

  return {
    kind: 'standard',
    sessionId: authSession.id,
    auditorInviteId: user.auditorInvite?.id,
    user: toAppUser(user, 'standard'),
    permissions,
    expiresAt: authSession.expiresAt,
    createdAt: authSession.createdAt,
  };
}

export function hasModuleAccess(permissions: EffectivePermissions, moduleKey: ModuleKey): boolean {
  return permissions.modules.has(moduleKey);
}

export function hasInputAccess(permissions: EffectivePermissions, inputKey: InputRightKey): boolean {
  return permissions.inputs.has(inputKey);
}
