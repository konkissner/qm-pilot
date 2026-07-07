import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

test.describe('DEV audit endpoint', () => {
  test('seed mutation appears in filtered query', async ({ request }) => {
    if (!process.env.DATABASE_URL) {
      test.skip();
      return;
    }

    const db = new PrismaClient();
    const tenant = await db.tenant.create({
      data: {
        name: 'E2E Audit',
        slug: `e2e-audit-${Date.now()}`,
        config: { create: {} },
        roles: { create: { key: 'gl', label: 'GL' } },
      },
      include: { roles: true },
    });
    const gl = await db.user.create({
      data: {
        tenantId: tenant.id,
        firstName: 'E2E',
        lastName: 'GL',
        email: `e2e-gl-${Date.now()}@example.com`,
        roles: { connect: { id: tenant.roles[0].id } },
      },
    });

    await db.auditEvent.create({
      data: {
        tenantId: tenant.id,
        userId: gl.id,
        userNameSnapshot: 'E2E GL',
        action: 'e2e.test',
        actionLabel: 'E2E Test-Event',
        objectType: 'Test',
        objectId: 'e2e-1',
        objectLabel: 'E2E Probe',
      },
    });

    const response = await request.get(
      `/api/dev/audit?tenantId=${tenant.id}&userId=${gl.id}&roleKeys=gl&action=e2e.test`,
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.items.some((item: { action: string }) => item.action === 'e2e.test')).toBe(true);

    await db.$disconnect();
  });
});
