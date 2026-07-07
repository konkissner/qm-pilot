import type { Prisma, PrismaClient } from '@prisma/client';
import { buildDiff } from '../audit/diff';
import { auditedMutation, loadUserNameSnapshot } from '../audit/audited';
import type { AuditEventContext } from '../audit/types';
import {
  assertInputRight,
  getEffectivePermissions,
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

export interface TenantConfigPatch {
  holidayRegion?: string;
  workingDays?: Prisma.InputJsonValue;
  escalationRpDays?: number;
  escalationGlDays?: number;
  sessionTimeoutMinutes?: number;
  kioskAutoLockSeconds?: number;
  retentionYears?: number;
  motivationTexts?: Prisma.InputJsonValue;
  vacationTexts?: Prisma.InputJsonValue;
  companyName?: string | null;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  legalStatus?: string | null;
  ssoEnabled?: boolean;
  ssoConfig?: Prisma.InputJsonValue | null;
  freightApprovalRule?: 'rpAndQmb' | 'rpOnly' | 'qmbOnly';
  brokerChapterNotApplicable?: boolean;
}

const CONFIG_AUDIT_FIELDS = [
  'holidayRegion',
  'workingDays',
  'escalationRpDays',
  'escalationGlDays',
  'sessionTimeoutMinutes',
  'kioskAutoLockSeconds',
  'retentionYears',
  'companyName',
  'freightApprovalRule',
  'brokerChapterNotApplicable',
  'ssoEnabled',
] as const;

function pickConfigFields(config: Record<string, unknown>) {
  return Object.fromEntries(CONFIG_AUDIT_FIELDS.map((key) => [key, config[key] ?? null]));
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

export async function updateTenantConfig(
  db: DbClient,
  actor: ActorContext,
  data: TenantConfigPatch,
  auditContext?: AuditEventContext,
) {
  const perms = getEffectivePermissions(
    { roleKeys: actor.roleKeys },
    await loadRoleRights(db, actor.tenantId),
    await loadUserRights(db, actor.id),
  );
  assertInputRight(perms, 'manageSystem');

  const existing = await db.tenantConfig.findUniqueOrThrow({ where: { tenantId: actor.tenantId } });
  const actorCtx = {
    tenantId: actor.tenantId,
    userId: actor.id,
    userNameSnapshot: await loadUserNameSnapshot(db, actor.id),
    context: auditContext,
  };

  return auditedMutation(asPrismaClient(db), actorCtx, async (tx) => {
    const updated = await tx.tenantConfig.update({
      where: { tenantId: actor.tenantId },
      data: data as Prisma.TenantConfigUpdateInput,
    });

    return {
      result: updated,
      event: {
        action: 'tenantConfig.changed',
        actionLabel: 'Mandantenkonfiguration geändert',
        objectType: 'TenantConfig',
        objectId: updated.id,
        objectLabel: 'Mandantenkonfiguration',
        diff: buildDiff(
          pickConfigFields(existing as unknown as Record<string, unknown>),
          pickConfigFields(updated as unknown as Record<string, unknown>),
        ),
      },
    };
  });
}
