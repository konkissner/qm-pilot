import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db';
import {
  auditorDefaultVisibleModules,
  getEffectivePermissions,
  INPUT_RIGHT_KEYS,
  MODULE_KEYS,
  type InputRightKey,
  type ModuleKey,
  type RoleKey,
} from '../../../lib/permissions';

const PERSONAS = { lena: 'l.frei@pharmazeutika.net', admin: 'it@pharmazeutika.net' } as const;

export const GET: APIRoute = async ({ url }) => {
  if (!import.meta.env.DEV) {
    return new Response(JSON.stringify({ error: 'Nur in DEV verfügbar.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const persona = url.searchParams.get('persona');
  if (persona !== 'lena' && persona !== 'ext' && persona !== 'admin') {
    return new Response(JSON.stringify({ error: 'Query-Parameter persona erforderlich (lena | ext | admin).' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const user =
    persona === 'ext'
      ? await prisma.user.findFirst({
          where: { firstName: 'Ana', lastName: 'Ilic', email: null },
          include: { roles: true },
        })
      : await prisma.user.findFirst({
          where: { email: PERSONAS[persona] },
          include: { roles: true },
        });

  if (!user) {
    return new Response(JSON.stringify({ error: 'Seed-Benutzer nicht gefunden. Bitte npm run db:seed ausführen.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const roleRights = await prisma.roleRight.findMany({
    where: { tenantId: user.tenantId },
    include: { role: { select: { key: true } } },
  });
  const userRights = await prisma.userRight.findMany({ where: { userId: user.id } });
  const invite = await prisma.auditorInvite.findFirst({ where: { userId: user.id } });
  const roleKeys = user.roles.map((r) => r.key as RoleKey);

  const permissions = getEffectivePermissions(
    { roleKeys },
    roleRights.map((rr) => ({
      roleKey: rr.role.key as RoleKey,
      kind: rr.kind as 'module' | 'input',
      rightKey: rr.rightKey,
      allowed: rr.allowed,
    })),
    userRights.map((ur) => ({
      kind: ur.kind as 'module' | 'input',
      rightKey: ur.rightKey,
      allowed: ur.allowed,
    })),
    invite ? { visibleModules: invite.visibleModules as ModuleKey[] } : undefined,
  );

  return new Response(
    JSON.stringify({
      persona,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, roleKeys },
      permissions: {
        modules: MODULE_KEYS.filter((m: ModuleKey) => permissions.modules.has(m)),
        inputs: INPUT_RIGHT_KEYS.filter((i: InputRightKey) => permissions.inputs.has(i)),
        readOnly: permissions.readOnly,
        auditorVisibleModules: invite?.visibleModules ?? auditorDefaultVisibleModules(),
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
