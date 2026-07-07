import type { PrismaClient, ReAuthMethod, SignatureMeaning } from '@prisma/client';
import { auditedMutation, loadUserNameSnapshot } from './audited';
import type { AuditActorContext, AuditEventContext } from './types';

export interface ReAuthVerifier {
  verify(userId: string, credential: string): Promise<boolean>;
}

export interface SignatureObjectRef {
  objectType: string;
  objectId: string;
  objectLabel: string;
}

export interface CreateSignatureInput {
  tenantId: string;
  userId: string;
  meaning: SignatureMeaning;
  object: SignatureObjectRef;
  credential: string;
  reAuthMethod: ReAuthMethod;
  comment?: string | null;
  context?: AuditEventContext;
}

const MEANING_LABELS: Record<SignatureMeaning, string> = {
  created: 'Erstellt',
  reviewed: 'Geprüft',
  approved: 'Freigegeben',
  acknowledged: 'Quittiert',
};

export class SignatureReAuthError extends Error {
  constructor() {
    super('Re-Authentifizierung fehlgeschlagen.');
    this.name = 'SignatureReAuthError';
  }
}

export async function createSignature(
  db: PrismaClient,
  verifier: ReAuthVerifier,
  input: CreateSignatureInput,
): Promise<{ id: string }> {
  const ok = await verifier.verify(input.userId, input.credential);
  const userNameSnapshot = await loadUserNameSnapshot(db, input.userId);
  const actor: AuditActorContext = {
    tenantId: input.tenantId,
    userId: input.userId,
    userNameSnapshot,
    context: input.context,
  };

  if (!ok) {
    await auditedMutation(db, actor, async () => ({
      result: null,
      event: {
        action: 'signature.reAuthFailed',
        actionLabel: 'Signatur: Re-Authentifizierung fehlgeschlagen',
        objectType: input.object.objectType,
        objectId: input.object.objectId,
        objectLabel: input.object.objectLabel,
        severity: 'warning',
      },
    }));
    throw new SignatureReAuthError();
  }

  return auditedMutation(db, actor, async (tx) => {
    const signature = await tx.signature.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        userNameSnapshot,
        meaning: input.meaning,
        objectType: input.object.objectType,
        objectId: input.object.objectId,
        objectLabel: input.object.objectLabel,
        reAuthMethod: input.reAuthMethod,
        comment: input.comment ?? null,
        lockedAt: new Date(),
      },
      select: { id: true },
    });

    return {
      result: signature,
      event: {
        action: 'signature.created',
        actionLabel: `Signatur: ${MEANING_LABELS[input.meaning]}`,
        objectType: 'Signature',
        objectId: signature.id,
        objectLabel: input.object.objectLabel,
        diff: {
          meaning: { old: null, new: input.meaning },
          objectType: { old: null, new: input.object.objectType },
          objectId: { old: null, new: input.object.objectId },
        },
      },
    };
  });
}
