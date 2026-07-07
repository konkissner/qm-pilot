import { describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createSignature, SignatureReAuthError, type ReAuthVerifier } from './signature';

const run = !!process.env.DATABASE_URL;

describe('createSignature with fake verifier', () => {
  const verifier: ReAuthVerifier = { verify: vi.fn() };

  it('rejects failed re-auth and writes audit event', async () => {
  if (!run) return;
    const db = new PrismaClient();
    const tenant = await db.tenant.create({
      data: {
        name: 'Sig',
        slug: `sig-${Date.now()}`,
        config: { create: {} },
        users: { create: { firstName: 'Sig', lastName: 'User', email: `sig-${Date.now()}@example.com` } },
      },
      include: { users: true },
    });
    const user = tenant.users[0]!;
    vi.mocked(verifier.verify).mockResolvedValueOnce(false);

    await expect(
      createSignature(db, verifier, {
        tenantId: tenant.id,
        userId: user.id,
        meaning: 'approved',
        object: { objectType: 'Document', objectId: 'doc-1', objectLabel: 'SOP-01' },
        credential: 'wrong',
        reAuthMethod: 'password',
      }),
    ).rejects.toBeInstanceOf(SignatureReAuthError);

    const failed = await db.auditEvent.findFirst({
      where: { tenantId: tenant.id, action: 'signature.reAuthFailed' },
    });
    expect(failed).not.toBeNull();
    expect(await db.signature.count({ where: { tenantId: tenant.id } })).toBe(0);
    await db.$disconnect();
  });

  it('creates immutable signature and audit event on success', async () => {
    if (!run) return;
    const db = new PrismaClient();
    const tenant = await db.tenant.create({
      data: {
        name: 'Sig2',
        slug: `sig2-${Date.now()}`,
        config: { create: {} },
        users: { create: { firstName: 'Sig', lastName: 'OK', email: `sig2-${Date.now()}@example.com` } },
      },
      include: { users: true },
    });
    const user = tenant.users[0]!;
    vi.mocked(verifier.verify).mockResolvedValueOnce(true);

    const sig = await createSignature(db, verifier, {
      tenantId: tenant.id,
      userId: user.id,
      meaning: 'acknowledged',
      object: { objectType: 'Task', objectId: 't-1', objectLabel: 'Reinigung' },
      credential: 'ok',
      reAuthMethod: 'pin',
    });

    const row = await db.signature.findUniqueOrThrow({ where: { id: sig.id } });
    expect(row.lockedAt).not.toBeNull();
    const audit = await db.auditEvent.findFirst({ where: { action: 'signature.created', objectId: sig.id } });
    expect(audit).not.toBeNull();

    await expect(db.signature.update({ where: { id: sig.id }, data: { comment: 'x' } })).rejects.toThrow();
    await db.$disconnect();
  });
});
