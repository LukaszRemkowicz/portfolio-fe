import { data } from 'react-router';
import type { Route } from './+types/not-found';
import NotFoundPage from '../components/NotFoundPage';
import { buildMeta } from '../seo/buildMeta';

export function loader() {
  return data(null, { status: 404 });
}

export function meta({ matches, location }: Route.MetaArgs) {
  const root = matches[0].loaderData;
  return buildMeta({
    title: 'Page Not Found',
    description: 'The requested page could not be found on this site.',
    robots: 'noindex, nofollow',
    includeCanonical: false,
    seoDefaults: root.seoDefaults,
    requestOrigin: root.requestOrigin,
    location,
  });
}

export default function NotFound() {
  return <NotFoundPage />;
}
