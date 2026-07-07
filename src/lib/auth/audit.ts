import type { PrismaClient } from '@prisma/client';
import { auditedMutation, loadUserNameSnapshot } from '../audit/audited';
import type { AuditEventContext } from '../audit/types';

const SYSTEM_ACTOR = {
  tenantId: '',
  userId: 'system',
  userNameSnapshot: 'System',
};

export async function writeAuthAuditEvent(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  event: {
    action: string;
    actionLabel: string;
    objectType?: string;
    objectId?: string;
    objectLabel?: string;
    diff?: Record<string, { old: unknown; new: unknown }> | null;
    severity?: 'info' | 'warning' | 'critical';
  },
  context?: AuditEventContext,
): Promise<void> {
  const userNameSnapshot =
    userId === 'system' ? 'System' : await loadUserNameSnapshot(db, userId).catch(() => 'Unbekannt');

  await auditedMutation(db, { tenantId, userId, userNameSnapshot, context }, async () => ({
    result: null,
    event: {
      action: event.action,
      actionLabel: event.actionLabel,
      objectType: event.objectType ?? 'Auth',
      objectId: event.objectId ?? userId,
      objectLabel: event.objectLabel ?? userNameSnapshot,
      diff: event.diff ?? undefined,
      severity: event.severity,
    },
  }));
}

export async function writeSystemAuthAuditEvent(
  db: PrismaClient,
  tenantId: string,
  userId: string,
  event: Parameters<typeof writeAuthAuditEvent>[3],
  context?: AuditEventContext,
): Promise<void> {
  await writeAuthAuditEvent(db, tenantId, userId, event, context);
}

export { SYSTEM_ACTOR };
