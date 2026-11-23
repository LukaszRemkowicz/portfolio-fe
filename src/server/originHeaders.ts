/**
 * Headers every server-side call to the API origin carries (BFF and SSR
 * loaders):
 * - the visitor IP, so backend throttling counts visitors, not the Worker;
 * - the shared origin secret for the hidden Supabase API (API_ORIGIN_SECRET).
 * Server-only: never import from browser code.
 */
export function getOriginHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {};

  // cf-connecting-ip is set by Cloudflare's edge; x-real-ip covers local dev.
  const clientIp =
    request.headers.get('cf-connecting-ip') ?? request.headers.get('x-real-ip');
  if (clientIp) {
    headers['X-Real-IP'] = clientIp;
    headers['X-Forwarded-For'] = clientIp;
    // The Supabase gateway overwrites the two above with the Worker's own IP.
    headers['X-Visitor-IP'] = clientIp;
  }

  // Read lazily: Worker secrets are exposed through process.env per request.
  const originSecret = process.env.API_ORIGIN_SECRET;
  if (originSecret) {
    headers['X-Origin-Secret'] = originSecret;
  }

  return headers;
}
