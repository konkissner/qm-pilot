import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db';
import { resolveKioskDevice } from '../../../lib/auth/session-resolver';

export const GET: APIRoute = async ({ cookies }) => {
  const device = await resolveKioskDevice(prisma, cookies);
  if (!device) {
    return new Response(JSON.stringify({ error: 'Gerät nicht registriert.' }), { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: {
      tenantId: device.tenantId,
      status: 'active',
      pinHash: { not: null },
      roles: { some: { key: 'external' } },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      initials: true,
      avatarColor: true,
      pinLockedUntil: true,
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  return new Response(JSON.stringify({ users }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
