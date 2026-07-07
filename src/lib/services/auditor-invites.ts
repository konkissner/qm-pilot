import type { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { auditedMutation, loadUserNameSnapshot } from '../audit/audited';
import type { AuditEventContext } from '../audit/types';
import { displayName } from '../auth/constants';
import { randomInitialPassword } from '../auth/kiosk-device';
import {
  assertManageUsers,
  getEffectivePermissions,
  type ModuleKey,
  type RoleKey,
  type RoleRightRecord,
  type UserRightRecord,
} from '../permissions';

type DbClient = PrismaClient;

export interface ActorContext {
  id: string;
  tenantId: string;
  roleKeys: RoleKey[];
}

export interface CreateAuditorInviteInput {
  auditorName: string;
  validFrom: Date;
  validUntil: Date;
  visibleModules: ModuleKey[];
  templateName?: string | null;
}

function asPrismaClient(db: DbClient): PrismaClient {
  if ('$transaction' in db) return db;
  throw new Error('Audited mutations require a PrismaClient.');
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

export async function createAuditorInvite(
  db: DbClient,
  actor: ActorContext,
  input: CreateAuditorInviteInput,
  auditContext?: AuditEventContext,
) {
  assertManageUsers(
    getEffectivePermissions(
      { roleKeys: actor.roleKeys },
      await loadRoleRights(db, actor.tenantId),
      await loadUserRights(db, actor.id),
    ),
  );

  const actorCtx = {
    tenantId: actor.tenantId,
    userId: actor.id,
    userNameSnapshot: await loadUserNameSnapshot(db, actor.id),
    context: auditContext,
  };

  return auditedMutation(asPrismaClient(db), actorCtx, async (tx) => {
    const invite = await tx.auditorInvite.create({
      data: {
        tenantId: actor.tenantId,
        auditorName: input.auditorName,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        visibleModules: input.visibleModules,
        templateName: input.templateName ?? null,
        createdById: actor.id,
      },
    });

    return {
      result: invite,
      event: {
        action: 'auditorInvite.created',
        actionLabel: 'Auditor-Einladung erstellt',
        objectType: 'AuditorInvite',
        objectId: invite.id,
        objectLabel: input.auditorName,
        diff: {
          auditorName: { old: null, new: input.auditorName },
          validUntil: { old: null, new: input.validUntil.toISOString() },
        },
      },
    };
  });
}

export async function activateAuditorInvite(
  db: DbClient,
  actor: ActorContext,
  inviteId: string,
  email: string,
  auditContext?: AuditEventContext,
) {
  assertManageUsers(
    getEffectivePermissions(
      { roleKeys: actor.roleKeys },
      await loadRoleRights(db, actor.tenantId),
      await loadUserRights(db, actor.id),
    ),
  );

  const invite = await db.auditorInvite.findUniqueOrThrow({ where: { id: inviteId } });
  if (invite.tenantId !== actor.tenantId) throw new Error('Mandant stimmt nicht überein.');
  if (invite.status !== 'pending') throw new Error('Einladung ist nicht mehr ausstehend.');

  const auditorRole = await db.role.findUniqueOrThrow({
    where: { tenantId_key: { tenantId: actor.tenantId, key: 'auditor' } },
    select: { id: true },
  });

  const initialPassword = randomInitialPassword();
  const passwordHash = await hashPassword(initialPassword);

  const actorCtx = {
    tenantId: actor.tenantId,
    userId: actor.id,
    userNameSnapshot: await loadUserNameSnapshot(db, actor.id),
    context: auditContext,
  };

  const result = await auditedMutation(asPrismaClient(db), actorCtx, async (tx) => {
    const [firstName, ...rest] = invite.auditorName.split(' ');
    const lastName = rest.join(' ') || 'Auditor';
    const user = await tx.user.create({
      data: {
        tenantId: actor.tenantId,
        email,
        name: displayName(firstName, lastName),
        firstName,
        lastName,
        initials: `${firstName[0] ?? 'A'}${lastName[0] ?? 'U'}`.toUpperCase(),
        mustChangePassword: true,
        emailVerified: true,
        roles: { connect: { id: auditorRole.id } },
        authAccounts: {
          create: {
            id: randomUUID(),
            accountId: email,
            providerId: 'credential',
            password: passwordHash,
          },
        },
      },
    });

    const updatedInvite = await tx.auditorInvite.update({
      where: { id: inviteId },
      data: { userId: user.id, status: 'active' },
    });

    return {
      result: { userId: user.id, initialPassword, invite: updatedInvite },
      event: {
        action: 'auditorInvite.activated',
        actionLabel: 'Auditor-Konto aktiviert',
        objectType: 'AuditorInvite',
        objectId: inviteId,
        objectLabel: invite.auditorName,
        diff: { userId: { old: null, new: user.id } },
      },
    };
  });

  return result;
}
