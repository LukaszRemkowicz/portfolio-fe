import { index, route } from '@react-router/dev/routes';
import type { RouteConfig } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  // Temporary catch-all until the remaining routes are migrated.
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
