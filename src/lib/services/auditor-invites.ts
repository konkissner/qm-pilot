import type { PrismaClient } from '@prisma/client';
import { auditedMutation, loadUserNameSnapshot } from '../audit/audited';
import type { AuditEventContext } from '../audit/types';
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
