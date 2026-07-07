import { defineMiddleware } from 'astro:middleware';
import { prisma } from './lib/db';
import { resolveAppSession } from './lib/auth/session-resolver';
import { isKioskPath, isMutationMethod, isPublicPath, moduleForPath } from './lib/navigation/routes';
import { writeAuthAuditEvent } from './lib/auth/audit';

const PROFILE_PATH = '/profile';
const LOGOUT_PATH = '/logout';

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request, cookies, redirect } = context;
  const pathname = url.pathname;

  if (isPublicPath(pathname) || ((import.meta.env.DEV || process.env.ALLOW_DEV_API === 'true') && pathname.startsWith('/api/dev'))) {
    return next();
  }

  const session = await resolveAppSession(prisma, {
    ip: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
    cookies,
    headers: request.headers,
  });

  if (!session) {
    if (isKioskPath(pathname)) return next();
    return redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  context.locals.session = session;
  context.locals.user = session.user;
  context.locals.permissions = session.permissions;

  if (session.user.mustChangePassword && pathname !== PROFILE_PATH && !pathname.startsWith('/api/auth')) {
    return redirect('/profile?changePassword=1');
  }

  if (session.permissions.readOnly && isMutationMethod(request.method)) {
    await writeAuthAuditEvent(prisma, session.user.tenantId, session.user.id, {
      action: 'auth.mutationDeniedReadOnly',
      actionLabel: 'Schreibzugriff im Auditor-Modus verweigert',
      severity: 'warning',
    });
    return new Response(JSON.stringify({ error: 'Nur Lesezugriff (Auditor-Modus).' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const moduleKey = moduleForPath(pathname);
  if (moduleKey && !session.permissions.modules.has(moduleKey)) {
    return redirect('/');
  }

  if (pathname === LOGOUT_PATH) {
    return next();
  }

  return next();
});
