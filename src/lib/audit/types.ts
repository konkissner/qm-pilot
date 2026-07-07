import type { AuditSeverity } from '@prisma/client';

export interface AuditEventContext {
  ip?: string;
  userAgent?: string;
  kioskDeviceId?: string;
  sessionId?: string;
}

export interface AuditActorContext {
  tenantId: string;
  userId: string;
  userNameSnapshot: string;
  context?: AuditEventContext;
}

export interface AuditEventInput {
  action: string;
  actionLabel: string;
  objectType: string;
  objectId: string;
  objectLabel: string;
  diff?: Record<string, { old: unknown; new: unknown }> | null;
  severity?: AuditSeverity;
}

export type AuditDiff = Record<string, { old: unknown; new: unknown }>;
