/**
 * Barsys Happy Hour — Cloudflare Worker
 *
 * Route this worker to: barsys.com/corporate-happy-hours*
 *
 * What it does:
 *   1. Intercepts requests to barsys.com/corporate-happy-hours
 *   2. Fetches the HTML from the Cloudflare Pages static origin
 *   3. Returns it directly (the <base> tag in the HTML handles asset loading)
 *
 * Deploy steps:
 *   1. In Cloudflare Dashboard → Workers & Pages → Create Worker
 *   2. Paste this script
 *   3. Go to the Worker's Settings → Triggers → Add Route:
 *      Route: barsys.com/corporate-happy-hours*
 *      Zone: barsys.com
 *
 * NOTE: Update PAGES_ORIGIN below once your Cloudflare Pages project is deployed.
 */

const PAGES_ORIGIN = 'https://barsys-happy-hours.pages.dev';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Only handle the exact path and sub-paths
    if (!url.pathname.startsWith('/corporate-happy-hours')) {
      return fetch(request); // pass through everything else
    }

    // Map /corporate-happy-hours → / on Pages origin
    const strippedPath = url.pathname.replace('/corporate-happy-hours', '') || '/';
    const originUrl = PAGES_ORIGIN + strippedPath + url.search;

    const originRequest = new Request(originUrl, {
      method: request.method,
      headers: {
        'Accept': request.headers.get('Accept') || '*/*',
        'Accept-Encoding': request.headers.get('Accept-Encoding') || 'gzip',
        'User-Agent': request.headers.get('User-Agent') || '',
      },
      cf: { cacheTtl: 300 },
    });

    const response = await fetch(originRequest);

    // Build clean response headers
    const newHeaders = new Headers();
    newHeaders.set('Content-Type', response.headers.get('Content-Type') || 'text/html; charset=utf-8');
    newHeaders.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
    newHeaders.set('X-Content-Type-Options', 'nosniff');
    newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    // Preserve ETags for caching
    const etag = response.headers.get('ETag');
    if (etag) newHeaders.set('ETag', etag);

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  },
};
