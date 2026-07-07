import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db';
import { registerKioskDevice, kioskDeviceCookieOptions } from '../../../lib/auth/kiosk-device';
import { hasInputRight } from '../../../lib/permissions';

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const session = locals.session;
  if (!session || !hasInputRight(session.permissions, 'manageSystem')) {
    return new Response(JSON.stringify({ error: 'Keine Berechtigung.' }), { status: 403 });
  }

  const body = (await request.json()) as { name?: string };
  if (!body.name?.trim()) {
    return new Response(JSON.stringify({ error: 'Gerätename erforderlich.' }), { status: 400 });
  }

  const { token } = await registerKioskDevice(
    prisma,
    { id: session.user.id, tenantId: session.user.tenantId },
    body.name.trim(),
    {
      ip: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    },
  );

  const secure = request.url.startsWith('https');
  const opts = kioskDeviceCookieOptions(token, secure);
  cookies.set(opts.name, opts.value, opts);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
