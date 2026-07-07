import type { Prisma, PrismaClient } from '@prisma/client';
import type { AuditActorContext, AuditEventInput } from './types';

const MUTATION_ACTIONS_REQUIRING_DIFF = new Set([
  'user.updated',
  'user.retired',
  'user.roleAssigned',
  'user.roleRemoved',
  'role.rightChanged',
  'user.rightChanged',
  'tenantConfig.changed',
]);

export function assertAuditDiff(event: AuditEventInput): void {
  if (!MUTATION_ACTIONS_REQUIRING_DIFF.has(event.action)) return;
  if (!event.diff || Object.keys(event.diff).length === 0) {
    throw new Error(`Audit event "${event.action}" requires a non-empty diff.`);
  }
}

export async function writeAuditEvent(
  tx: Prisma.TransactionClient,
  actor: AuditActorContext,
  event: AuditEventInput,
): Promise<void> {
  assertAuditDiff(event);
  await tx.auditEvent.create({
    data: {
      tenantId: actor.tenantId,
      userId: actor.userId,
      userNameSnapshot: actor.userNameSnapshot,
      action: event.action,
      actionLabel: event.actionLabel,
      objectType: event.objectType,
      objectId: event.objectId,
      objectLabel: event.objectLabel,
      diff: (event.diff as Prisma.InputJsonValue) ?? undefined,
      context: (actor.context as Prisma.InputJsonValue) ?? undefined,
      severity: event.severity ?? 'info',
    },
  });
}

export async function auditedMutation<T>(
  db: PrismaClient,
  actor: AuditActorContext,
  fn: (tx: Prisma.TransactionClient) => Promise<{ result: T; event: AuditEventInput }>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    const { result, event } = await fn(tx);
    await writeAuditEvent(tx, actor, event);
    return result;
  });
}

export async function loadUserNameSnapshot(
  db: Prisma.TransactionClient | PrismaClient,
  userId: string,
): Promise<string> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  });
  return `${user.firstName} ${user.lastName}`.trim();
}
