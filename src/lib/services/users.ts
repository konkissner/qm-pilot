import type { Prisma, PrismaClient } from '@prisma/client';
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
export interface ActorContext { id: string; tenantId: string; roleKeys: RoleKey[] }
export interface UserWriteInput {
  email?: string | null; firstName: string; lastName: string; initials?: string | null;
  avatarColor?: string | null; avatarUrl?: string | null; pinHash?: string | null;
  oidcSubject?: string | null; isPlatformDeveloper?: boolean;
}

async function loadRoleRights(db: DbClient, tenantId: string): Promise<RoleRightRecord[]> {
  const rows = await db.roleRight.findMany({ where: { tenantId }, include: { role: { select: { key: true } } } });
  return rows.map((row) => ({ roleKey: row.role.key as RoleKey, kind: row.kind as 'module' | 'input', rightKey: row.rightKey, allowed: row.allowed }));
}
async function loadUserRights(db: DbClient, userId: string): Promise<UserRightRecord[]> {
  const rows = await db.userRight.findMany({ where: { userId } });
  return rows.map((row) => ({ kind: row.kind as 'module' | 'input', rightKey: row.rightKey, allowed: row.allowed }));
}
async function loadActorPermissions(db: DbClient, actor: ActorContext) {
  return getEffectivePermissions({ roleKeys: actor.roleKeys }, await loadRoleRights(db, actor.tenantId), await loadUserRights(db, actor.id));
}
function assertSameTenant(actor: ActorContext, tenantId: string) { if (actor.tenantId !== tenantId) throw new ForbiddenError('Mandant stimmt nicht überein.'); }
async function roleConnectIds(db: DbClient, tenantId: string, roleKeys: RoleKey[]) {
  const roles = await db.role.findMany({ where: { tenantId, key: { in: roleKeys } }, select: { id: true } });
  if (roles.length !== roleKeys.length) throw new Error('Eine oder mehrere Rollen wurden nicht gefunden.');
  return roles.map((r) => ({ id: r.id }));
}

export async function createUser(db: DbClient, actor: ActorContext, tenantId: string, data: UserWriteInput, roleKeys: RoleKey[] = []) {
  assertSameTenant(actor, tenantId); assertManageUsers(await loadActorPermissions(db, actor));
  for (const roleKey of roleKeys) if (!canAssignRole({ roleKeys: actor.roleKeys }, roleKey)) throw new ForbiddenError(`Rolle ${roleKey} darf nicht zugewiesen werden.`);
  const user = await db.user.create({ data: { tenantId, email: data.email ?? null, firstName: data.firstName, lastName: data.lastName, initials: data.initials ?? null, avatarColor: data.avatarColor ?? null, avatarUrl: data.avatarUrl ?? null, pinHash: data.pinHash ?? null, oidcSubject: data.oidcSubject ?? null, isPlatformDeveloper: data.isPlatformDeveloper ?? false, roles: roleKeys.length ? { connect: await roleConnectIds(db, tenantId, roleKeys) } : undefined }, select: { id: true } });
  // AUDIT(WP-02): user.created
  return user;
}
export async function updateUser(db: DbClient, actor: ActorContext, userId: string, data: Partial<UserWriteInput>) {
  const target = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { tenantId: true } }); assertSameTenant(actor, target.tenantId);
  if (actor.id !== userId) assertManageUsers(await loadActorPermissions(db, actor));
  await db.user.update({ where: { id: userId }, data: { email: data.email, firstName: data.firstName, lastName: data.lastName, initials: data.initials, avatarColor: data.avatarColor, avatarUrl: data.avatarUrl, pinHash: data.pinHash, oidcSubject: data.oidcSubject, isPlatformDeveloper: data.isPlatformDeveloper } });
  // AUDIT(WP-02): user.updated
}
export async function retireUser(db: DbClient, actor: ActorContext, userId: string) {
  const target = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { tenantId: true, status: true } }); assertSameTenant(actor, target.tenantId);
  assertManageUsers(await loadActorPermissions(db, actor)); if (target.status === 'retired') return;
  await db.user.update({ where: { id: userId }, data: { status: 'retired', retiredAt: new Date() } });
  // AUDIT(WP-02): user.retired
}
export async function assignRole(db: DbClient, actor: ActorContext, userId: string, roleKey: RoleKey) {
  const target = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { roles: { select: { id: true, key: true } } } }); assertSameTenant(actor, target.tenantId);
  assertManageUsers(await loadActorPermissions(db, actor)); if (!canAssignRole({ roleKeys: actor.roleKeys }, roleKey)) throw new ForbiddenError(`Rolle ${roleKey} darf nicht zugewiesen werden.`);
  if (target.roles.some((r) => r.key === roleKey)) return;
  const role = await db.role.findUniqueOrThrow({ where: { tenantId_key: { tenantId: target.tenantId, key: roleKey } }, select: { id: true } });
  await db.user.update({ where: { id: userId }, data: { roles: { connect: { id: role.id } } } });
  // AUDIT(WP-02): user.role.assigned
}
export async function removeRole(db: DbClient, actor: ActorContext, userId: string, roleKey: RoleKey) {
  const target = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { roles: { select: { id: true, key: true } } } }); assertSameTenant(actor, target.tenantId);
  assertManageUsers(await loadActorPermissions(db, actor)); if (!canAssignRole({ roleKeys: actor.roleKeys }, roleKey)) throw new ForbiddenError(`Rolle ${roleKey} darf nicht entzogen werden.`);
  const role = target.roles.find((r) => r.key === roleKey); if (!role) return;
  await db.user.update({ where: { id: userId }, data: { roles: { disconnect: { id: role.id } } } });
  // AUDIT(WP-02): user.role.removed
}
export async function setRoleRightOverride(db: DbClient, actor: ActorContext, roleKey: RoleKey, kind: 'module' | 'input', rightKey: ModuleKey | InputRightKey, allowed: boolean) {
  assertSameTenant(actor, actor.tenantId); assertManageUsers(await loadActorPermissions(db, actor));
  const role = await db.role.findUniqueOrThrow({ where: { tenantId_key: { tenantId: actor.tenantId, key: roleKey } }, select: { id: true } });
  await db.roleRight.upsert({ where: { roleId_kind_rightKey: { roleId: role.id, kind, rightKey } }, create: { tenantId: actor.tenantId, roleId: role.id, kind, rightKey, allowed }, update: { allowed } });
  // AUDIT(WP-02): roleRight.updated
}
export async function setUserRightOverride(db: DbClient, actor: ActorContext, userId: string, kind: 'module' | 'input', rightKey: ModuleKey | InputRightKey, allowed: boolean) {
  const target = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { tenantId: true } }); assertSameTenant(actor, target.tenantId);
  assertManageUsers(await loadActorPermissions(db, actor));
  await db.userRight.upsert({ where: { userId_kind_rightKey: { userId, kind, rightKey } }, create: { tenantId: actor.tenantId, userId, kind, rightKey, allowed }, update: { allowed } });
  // AUDIT(WP-02): userRight.updated
}
export { ForbiddenError as UserServiceForbiddenError };
