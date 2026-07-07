import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db';
import { getAuthForTenant } from '../../../lib/auth/config';

export const prerender = false;

export const ALL: APIRoute = async (context) => {
  const auth = await getAuthForTenant(prisma);
  return auth.handler(context.request);
};
