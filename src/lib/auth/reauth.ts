import type { PrismaClient } from '@prisma/client';
import type { ReAuthVerifier } from '../audit/signature';
import { verifyPassword } from 'better-auth/crypto';
import { checkPasswordLock, recordPasswordFailure, resetPasswordFailures } from './password-lock';
import { verifyPinCredential } from './pin';

export function createReAuthVerifier(db: PrismaClient): ReAuthVerifier {
  return {
    async verify(userId: string, credential: string): Promise<boolean> {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { authAccounts: true, roles: true },
      });
      if (!user || user.status === 'retired') return false;

      if (user.pinHash && user.roles.some((r) => r.key === 'external')) {
        const result = await verifyPinCredential(db, userId, credential, { recordFailure: true, resetOnSuccess: false });
        return result.ok;
      }

      const lock = await checkPasswordLock(db, userId);
      if (!lock.allowed) return false;

      const credentialAccount = user.authAccounts.find((a) => a.providerId === 'credential');
      if (!credentialAccount?.password) return false;

      const ok = await verifyPassword({ hash: credentialAccount.password, password: credential });
      if (ok) {
        await resetPasswordFailures(db, userId);
        return true;
      }

      await recordPasswordFailure(db, userId);
      return false;
    },
  };
}
