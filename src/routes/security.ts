import type { Route } from './+types/security';
import { getRequestOrigin } from '../utils/requestMeta';

const EXPIRES_IN_MS = 180 * 24 * 60 * 60 * 1000;

// RFC 9116 security.txt. Resource route like robots.txt (Workers assets would shadow
// a public/ file); Expires rolls forward so the file never goes stale.
export function loader({ request }: Route.LoaderArgs) {
  const origin = getRequestOrigin(request);
  const expires = new Date(Date.now() + EXPIRES_IN_MS).toISOString();

  return new Response(
    [
      `Contact: ${origin}/#contact`,
      `Expires: ${expires}`,
      'Preferred-Languages: en, pl',
      `Canonical: ${origin}/.well-known/security.txt`,
      '',
    ].join('\n'),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    }
  );
}
