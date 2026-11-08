import { index, route } from '@react-router/dev/routes';
import type { RouteConfig } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('astrophotography', 'routes/astrophotography.tsx', [
    route(':slug', 'routes/astrophotography.detail.tsx'),
  ]),
  route('travel/:countrySlug/:placeSlug/:dateSlug', 'routes/travel.tsx'),
  route('privacy', 'routes/privacy.tsx'),
  route('shop', 'routes/shop.tsx'),
  route('programming', 'routes/programming.tsx'),
  route('app/*', 'routes/bff.ts'),
  route('health', 'routes/health.ts'),
  route('robots.txt', 'routes/robots.ts'),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
