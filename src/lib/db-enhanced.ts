import { enhance } from '@zenstackhq/runtime';
import type { UserStatus } from '@prisma/client';
import { prisma } from './db';

export interface AuthContext {
  id: string;
  tenantId: string;
  status: UserStatus;
}

export function getEnhancedPrisma(auth: AuthContext) {
  return enhance(prisma, { user: { id: auth.id, tenantId: auth.tenantId, status: auth.status } });
}
