import type { APIRoute } from 'astro';
import { createS3ClientFromEnv, getObjectStream } from '@/lib/storage';

/**
 * Authenticated file delivery — session + permission checks land in WP-20.
 * Direct bucket access without this endpoint must fail (no public ACL).
 */
export const GET: APIRoute = async ({ params, request }) => {
  const objectId = params.id;
  if (!objectId) {
    return new Response(JSON.stringify({ error: 'Missing file id' }), { status: 400 });
  }

  // WP-03/WP-20: replace with real session + permission check
  const authHeader = request.headers.get('authorization');
  const sessionCookie = request.headers.get('cookie')?.includes('better-auth');
  if (!authHeader && !sessionCookie) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const client = createS3ClientFromEnv();
    const { stream, contentType, contentLength } = await getObjectStream(client, objectId);

    const headers: HeadersInit = {
      'Content-Type': contentType ?? 'application/octet-stream',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    };
    if (contentLength !== undefined) {
      headers['Content-Length'] = String(contentLength);
    }

    return new Response(stream as unknown as ReadableStream, { status: 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Storage error';
    const status = message.includes('not found') ? 404 : 503;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
