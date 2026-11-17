// Same values nginx sent before the Worker replaced it.
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), unload=(self)',
};

function apply(headers: Headers) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
}

/** Add security headers (without overwriting route-set ones), cloning when headers are immutable. */
export function withSecurityHeaders(response: Response): Response {
  try {
    apply(response.headers);
    return response;
  } catch {
    const copy = new Response(response.body, response);
    apply(copy.headers);
    return copy;
  }
}
