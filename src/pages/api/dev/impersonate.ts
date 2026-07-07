import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db';
import { getAuthForTenant, auditLoginSuccess } from '../../../lib/auth/config';
import { DEV_PERSONA_LOOKUP, type DevPersonaKey } from '../../../lib/dev-personas';

export const POST: APIRoute = async ({ request }) => {
  const devApiEnabled = import.meta.env.DEV || process.env.ALLOW_DEV_API === 'true';
  if (!devApiEnabled) {
    return new Response(JSON.stringify({ error: 'Nur in DEV verfügbar.' }), { status: 404 });
  }

  const body = (await request.json()) as { persona?: DevPersonaKey };
  const persona = body.persona;
  if (!persona || !(persona in DEV_PERSONA_LOOKUP)) {
    return new Response(JSON.stringify({ error: 'persona erforderlich' }), { status: 400 });
  }

  const lookup = DEV_PERSONA_LOOKUP[persona];
  const user = await prisma.user.findFirst({
    where: lookup,
    include: { authAccounts: true },
  });
  if (!user?.email) {
    return new Response(JSON.stringify({ error: 'Benutzer nicht gefunden' }), { status: 404 });
  }

  const auth = await getAuthForTenant(prisma);
  const signIn = await auth.api.signInEmail({
    body: { email: user.email, password: process.env.DEV_USER_PASSWORD ?? 'DevPassword12!' },
    asResponse: true,
  });

  if (!signIn.ok) {
    return new Response(JSON.stringify({ error: 'Impersonation fehlgeschlagen' }), { status: 401 });
  }

  await auditLoginSuccess(prisma, user.tenantId, user.id, 'dev-impersonation', {
    ip: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  });

  return signIn;
};
