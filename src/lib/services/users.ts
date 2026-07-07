import type { Prisma, PrismaClient } from '@prisma/client';
import { buildDiff } from '../audit/diff';
import { auditedMutation, loadUserNameSnapshot } from '../audit/audited';
import type { AuditEventContext } from '../audit/types';
import { revokeAllUserSessions } from '../auth/sessions';
import { writeAuthAuditEvent } from '../auth/audit';
import {
  assertManageUsers,
  canAssignRole,
  getEffectivePermissions,
  PermissionForbiddenError as ForbiddenError,
  type InputRightKey,
  type ModuleKey,
  type RoleKey,
  type RoleRightRecord,
  type UserRightRecord,
} from '../permissions';

type DbClient = PrismaClient | Prisma.TransactionClient;

export interface ActorContext {
  id: string;
  tenantId: string;
  roleKeys: RoleKey[];
}

export interface UserWriteInput {
  email?: string | null;
  firstName: string;
  lastName: string;
  initials?: string | null;
  avatarColor?: string | null;
  avatarUrl?: string | null;
  pinHash?: string | null;
  oidcSubject?: string | null;
  isPlatformDeveloper?: boolean;
}

export interface ServiceAuditOptions {
  auditContext?: AuditEventContext;
}

const USER_AUDIT_FIELDS = [
  'email',
  'firstName',
  'lastName',
  'initials',
  'avatarColor',
  'avatarUrl',
  'pinHash',
  'oidcSubject',
  'isPlatformDeveloper',
  'status',
  'retiredAt',
] as const;

function pickUserAuditFields(user: Record<string, unknown>) {
  return Object.fromEntries(USER_AUDIT_FIELDS.map((key) => [key, user[key] ?? null]));
}

function userObjectLabel(user: { firstName: string; lastName: string; email?: string | null }) {
  return user.email ? `${user.firstName} ${user.lastName} (${user.email})` : `${user.firstName} ${user.lastName}`;
}

async function loadRoleRights(db: DbClient, tenantId: string): Promise<RoleRightRecord[]> {
  const rows = await db.roleRight.findMany({ where: { tenantId }, include: { role: { select: { key: true } } } });
  return rows.map((row) => ({
    roleKey: row.role.key as RoleKey,
    kind: row.kind as 'module' | 'input',
    rightKey: row.rightKey,
    allowed: row.allowed,
  }));
}

async function loadUserRights(db: DbClient, userId: string): Promise<UserRightRecord[]> {
  const rows = await db.userRight.findMany({ where: { userId } });
  return rows.map((row) => ({ kind: row.kind as 'module' | 'input', rightKey: row.rightKey, allowed: row.allowed }));
}

async function loadActorPermissions(db: DbClient, actor: ActorContext) {
  return getEffectivePermissions(
    { roleKeys: actor.roleKeys },
    await loadRoleRights(db, actor.tenantId),
    await loadUserRights(db, actor.id),
  );
}

function assertSameTenant(actor: ActorContext, tenantId: string) {
  if (actor.tenantId !== tenantId) throw new ForbiddenError('Mandant stimmt nicht überein.');
}

async function roleConnectIds(db: DbClient, tenantId: string, roleKeys: RoleKey[]) {
  const roles = await db.role.findMany({ where: { tenantId, key: { in: roleKeys } }, select: { id: true } });
  if (roles.length !== roleKeys.length) throw new Error('Eine oder mehrere Rollen wurden nicht gefunden.');
  return roles.map((r) => ({ id: r.id }));
}

function asPrismaClient(db: DbClient): PrismaClient {
  if ('$transaction' in db) return db;
  throw new Error('Audited mutations require a PrismaClient, not a transaction client.');
}

async function actorAuditContext(db: DbClient, actor: ActorContext, auditContext?: AuditEventContext) {
  return {
    tenantId: actor.tenantId,
    userId: actor.id,
    userNameSnapshot: await loadUserNameSnapshot(db, actor.id),
    context: auditContext,
  };
}

export async function createUser(
  db: DbClient,
  actor: ActorContext,
  tenantId: string,
  data: UserWriteInput,
  roleKeys: RoleKey[] = [],
  options: ServiceAuditOptions = {},
) {
  assertSameTenant(actor, tenantId);
  assertManageUsers(await loadActorPermissions(db, actor));
  for (const roleKey of roleKeys) {
    if (!canAssignRole({ roleKeys: actor.roleKeys }, roleKey)) {
      throw new ForbiddenError(`Rolle ${roleKey} darf nicht zugewiesen werden.`);
    }
  }

  return auditedMutation(asPrismaClient(db), await actorAuditContext(db, actor, options.auditContext), async (tx) => {
    const user = await tx.user.create({
      data: {
        tenantId,
        email: data.email ?? null,
        name: `${data.firstName} ${data.lastName}`.trim(),
        firstName: data.firstName,
        lastName: data.lastName,
        initials: data.initials ?? null,
        avatarColor: data.avatarColor ?? null,
        avatarUrl: data.avatarUrl ?? null,
        pinHash: data.pinHash ?? null,
        oidcSubject: data.oidcSubject ?? null,
        isPlatformDeveloper: data.isPlatformDeveloper ?? false,
        roles: roleKeys.length ? { connect: await roleConnectIds(tx, tenantId, roleKeys) } : undefined,
      },
    });

    return {
      result: { id: user.id },
      event: {
        action: 'user.created',
        actionLabel: 'Benutzer angelegt',
        objectType: 'User',
        objectId: user.id,
        objectLabel: userObjectLabel(user),
        diff: buildDiff(null, pickUserAuditFields(user as unknown as Record<string, unknown>)),
      },
    };
  });
}

export async function updateUser(
  db: DbClient,
  actor: ActorContext,
  userId: string,
  data: Partial<UserWriteInput>,
  options: ServiceAuditOptions = {},
) {
  const target = await db.user.findUniqueOrThrow({ where: { id: userId } });
  assertSameTenant(actor, target.tenantId);
  if (actor.id !== userId) assertManageUsers(await loadActorPermissions(db, actor));

  return auditedMutation(asPrismaClient(db), await actorAuditContext(db, actor, options.auditContext), async (tx) => {
    const before = pickUserAuditFields(target as unknown as Record<string, unknown>);
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        initials: data.initials,
        avatarColor: data.avatarColor,
        avatarUrl: data.avatarUrl,
        pinHash: data.pinHash,
        oidcSubject: data.oidcSubject,
        isPlatformDeveloper: data.isPlatformDeveloper,
      },
    });

    return {
      result: undefined,
      event: {
        action: 'user.updated',
        actionLabel: 'Benutzer geändert',
        objectType: 'User',
        objectId: userId,
        objectLabel: userObjectLabel(updated),
        diff: buildDiff(before, pickUserAuditFields(updated as unknown as Record<string, unknown>)),
      },
    };
  });
}

export async function retireUser(
  db: DbClient,
  actor: ActorContext,
  userId: string,
  options: ServiceAuditOptions = {},
) {
  const target = await db.user.findUniqueOrThrow({ where: { id: userId } });
  assertSameTenant(actor, target.tenantId);
  assertManageUsers(await loadActorPermissions(db, actor));
  if (target.status === 'retired') return;

  return auditedMutation(asPrismaClient(db), await actorAuditContext(db, actor, options.auditContext), async (tx) => {
    const before = pickUserAuditFields(target as unknown as Record<string, unknown>);
    const updated = await tx.user.update({
      where: { id: userId },
      data: { status: 'retired', retiredAt: new Date() },
    });
    await revokeAllUserSessions(asPrismaClient(db), userId);
    await writeAuthAuditEvent(
      asPrismaClient(db),
      target.tenantId,
      userId,
      { action: 'auth.accessRevoked', actionLabel: 'Zugang entzogen (Austritt)' },
      options.auditContext,
    );

    return {
      result: undefined,
      event: {
        action: 'user.retired',
        actionLabel: 'Benutzer deaktiviert',
        objectType: 'User',
        objectId: userId,
        objectLabel: userObjectLabel(updated),
        diff: buildDiff(before, pickUserAuditFields(updated as unknown as Record<string, unknown>)),
      },
    };
  });
}

export async function assignRole(
  db: DbClient,
  actor: ActorContext,
  userId: string,
  roleKey: RoleKey,
  options: ServiceAuditOptions = {},
) {
  const target = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { roles: { select: { id: true, key: true, label: true } } },
  });
  assertSameTenant(actor, target.tenantId);
  assertManageUsers(await loadActorPermissions(db, actor));
  if (!canAssignRole({ roleKeys: actor.roleKeys }, roleKey)) {
    throw new ForbiddenError(`Rolle ${roleKey} darf nicht zugewiesen werden.`);
  }
  if (target.roles.some((r) => r.key === roleKey)) return;

  const role = await db.role.findUniqueOrThrow({
    where: { tenantId_key: { tenantId: target.tenantId, key: roleKey } },
    select: { id: true, label: true },
  });

  return auditedMutation(asPrismaClient(db), await actorAuditContext(db, actor, options.auditContext), async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { roles: { connect: { id: role.id } } } });
    return {
      result: undefined,
      event: {
        action: 'user.roleAssigned',
        actionLabel: 'Rolle zugewiesen',
        objectType: 'User',
        objectId: userId,
        objectLabel: userObjectLabel(target),
        diff: { role: { old: null, new: roleKey } },
      },
    };
  });
}

export async function removeRole(
  db: DbClient,
  actor: ActorContext,
  userId: string,
  roleKey: RoleKey,
  options: ServiceAuditOptions = {},
) {
  const target = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { roles: { select: { id: true, key: true } } },
  });
  assertSameTenant(actor, target.tenantId);
  assertManageUsers(await loadActorPermissions(db, actor));
  if (!canAssignRole({ roleKeys: actor.roleKeys }, roleKey)) {
    throw new ForbiddenError(`Rolle ${roleKey} darf nicht entzogen werden.`);
  }
  const role = target.roles.find((r) => r.key === roleKey);
  if (!role) return;

  return auditedMutation(asPrismaClient(db), await actorAuditContext(db, actor, options.auditContext), async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { roles: { disconnect: { id: role.id } } } });
    return {
      result: undefined,
      event: {
        action: 'user.roleRemoved',
        actionLabel: 'Rolle entzogen',
        objectType: 'User',
        objectId: userId,
        objectLabel: userObjectLabel(target),
        diff: { role: { old: roleKey, new: null } },
      },
    };
  });
}

export async function setRoleRightOverride(
  db: DbClient,
  actor: ActorContext,
  roleKey: RoleKey,
  kind: 'module' | 'input',
  rightKey: ModuleKey | InputRightKey,
  allowed: boolean,
  options: ServiceAuditOptions = {},
) {
  assertSameTenant(actor, actor.tenantId);
  assertManageUsers(await loadActorPermissions(db, actor));
  const role = await db.role.findUniqueOrThrow({
    where: { tenantId_key: { tenantId: actor.tenantId, key: roleKey } },
    select: { id: true, label: true },
  });
  const existing = await db.roleRight.findUnique({
    where: { roleId_kind_rightKey: { roleId: role.id, kind, rightKey } },
  });

  return auditedMutation(asPrismaClient(db), await actorAuditContext(db, actor, options.auditContext), async (tx) => {
    const row = await tx.roleRight.upsert({
      where: { roleId_kind_rightKey: { roleId: role.id, kind, rightKey } },
      create: { tenantId: actor.tenantId, roleId: role.id, kind, rightKey, allowed },
      update: { allowed },
    });

    return {
      result: undefined,
      event: {
        action: 'role.rightChanged',
        actionLabel: 'Rollenrecht geändert',
        objectType: 'Role',
        objectId: role.id,
        objectLabel: `${role.label} / ${rightKey}`,
        diff: { allowed: { old: existing?.allowed ?? null, new: row.allowed } },
      },
    };
  });
}

export async function setUserRightOverride(
  db: DbClient,
  actor: ActorContext,
  userId: string,
  kind: 'module' | 'input',
  rightKey: ModuleKey | InputRightKey,
  allowed: boolean,
  options: ServiceAuditOptions = {},
) {
  const target = await db.user.findUniqueOrThrow({ where: { id: userId } });
  assertSameTenant(actor, target.tenantId);
  assertManageUsers(await loadActorPermissions(db, actor));
  const existing = await db.userRight.findUnique({
    where: { userId_kind_rightKey: { userId, kind, rightKey } },
  });

  return auditedMutation(asPrismaClient(db), await actorAuditContext(db, actor, options.auditContext), async (tx) => {
    const row = await tx.userRight.upsert({
      where: { userId_kind_rightKey: { userId, kind, rightKey } },
      create: { tenantId: actor.tenantId, userId, kind, rightKey, allowed },
      update: { allowed },
    });

    return {
      result: undefined,
      event: {
        action: 'user.rightChanged',
        actionLabel: 'Benutzerrecht geändert',
        objectType: 'User',
        objectId: userId,
        objectLabel: userObjectLabel(target),
        diff: { [`${kind}.${rightKey}`]: { old: existing?.allowed ?? null, new: row.allowed } },
      },
    };
  });
}

export { ForbiddenError as UserServiceForbiddenError };
