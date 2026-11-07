import { data } from 'react-router';
import type { Route } from './+types/not-found';
import NotFoundPage from '../components/NotFoundPage';
import { NOT_FOUND_SEO, routeMeta } from '../seo/buildMeta';

export function loader() {
  return data({ seo: NOT_FOUND_SEO }, { status: 404 });
}

export function meta({ data, matches, location }: Route.MetaArgs) {
  return routeMeta(data?.seo, matches[0].loaderData, location);
}

export default function NotFound() {
  return <NotFoundPage />;
}
