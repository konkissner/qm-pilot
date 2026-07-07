import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db';
import { queryAuditEvents } from '../../../lib/audit/query';
import type { RoleKey } from '../../../lib/permissions';

const devApiEnabled = import.meta.env.DEV || process.env.ALLOW_DEV_API === 'true';

export const GET: APIRoute = async ({ url }) => {
  if (!devApiEnabled) {
    return new Response(JSON.stringify({ error: 'Nur in DEV verfügbar.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const tenantId = url.searchParams.get('tenantId');
  const userId = url.searchParams.get('userId');
  const roleKeys = (url.searchParams.get('roleKeys') ?? 'gl')
    .split(',')
    .map((r) => r.trim()) as RoleKey[];

  if (!tenantId || !userId) {
    return new Response(JSON.stringify({ error: 'tenantId und userId erforderlich.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await queryAuditEvents(prisma, {
      tenantId,
      actorRoleKeys: roleKeys,
      userId: url.searchParams.get('filterUserId') ?? undefined,
      action: url.searchParams.get('action') ?? undefined,
      objectType: url.searchParams.get('objectType') ?? undefined,
      objectId: url.searchParams.get('objectId') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
      limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unbekannter Fehler' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
