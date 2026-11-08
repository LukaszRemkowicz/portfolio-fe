import type { Route } from './+types/home';
import HomePage from '../HomePage';
import { buildMeta } from '../seo/buildMeta';

export function meta({ matches, location }: Route.MetaArgs) {
  const root = matches[0].loaderData;
  return buildMeta({
    seoDefaults: root.seoDefaults,
    requestOrigin: root.requestOrigin,
    location,
  });
}

export default function Home() {
  return <HomePage />;
}
