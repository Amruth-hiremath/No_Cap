export async function onRequest(context) {
  const { request, env, next } = context;
  const incoming = new URL(request.url);
  const path = incoming.pathname;

  // Keep the browser talking to its own Pages origin. This proxy forwards
  // only NO CAP's API/auth routes to the separate Worker so session cookies
  // remain first-party on the pages.dev origin.
  if (!(path.startsWith('/auth') || path.startsWith('/v1/'))) {
    return next();
  }

  const upstreamBase = String(env.NO_CAP_API_URL || '').replace(/\/$/, '');
  if (!upstreamBase) {
    return new Response('NO_CAP_API_URL is not configured for this Pages project.', { status: 503 });
  }

  const upstreamUrl = `${upstreamBase}${path}${incoming.search}`;
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('x-nocap-forwarded-host', incoming.host);
  headers.set('x-nocap-forwarded-origin', incoming.origin);

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = request.body;

  const response = await fetch(upstreamUrl, init);

  // Keep all response headers, including the session Set-Cookie header.
  // The OAuth state itself is stored server-side in D1, so the callback does
  // not depend on a cookie surviving the Pages -> Worker proxy hop.
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Cache-Control', 'no-store');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
