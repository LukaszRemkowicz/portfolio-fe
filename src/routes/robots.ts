import type { Route } from './+types/robots';
import { getRequestOrigin } from '../utils/requestMeta';

// Resource route (no static public/robots.txt: Workers assets would shadow it).
export function loader({ request }: Route.LoaderArgs) {
  // Read lazily, at request time (Workers env).
  const domain =
    process.env.SITE_DOMAIN || new URL(getRequestOrigin(request)).host;

  return new Response(
    `User-agent: *\nAllow: /\n\nSitemap: https://${domain}/sitemap.xml\n`,
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}
