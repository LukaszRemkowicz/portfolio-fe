/**
 * Headers every server-side call to the Django origin carries (BFF and SSR
 * loaders):
 * - the visitor IP, so backend throttling counts visitors, not the Worker;
 * - the Cloudflare Access service token, when the origin sits behind a
 *   Cloudflare Tunnel protected by Access (CF_ACCESS_CLIENT_ID/SECRET).
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
  }

  // Read lazily: Worker secrets are exposed through process.env per request.
  const accessId = process.env.CF_ACCESS_CLIENT_ID;
  const accessSecret = process.env.CF_ACCESS_CLIENT_SECRET;
  if (accessId && accessSecret) {
    headers['CF-Access-Client-Id'] = accessId;
    headers['CF-Access-Client-Secret'] = accessSecret;
  }

  return headers;
}
