import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { data } from 'react-router';
import type { Route } from './+types/programming';
import ProgrammingRoute from '../components/ProgrammingRoute';
import { fetchSettings } from '../api/services';
import {
  createLoaderQueryClient,
  createLoaderRequestContext,
  fetchQueryOrNotFound,
} from '../utils/loaderData';
import { NOT_FOUND_SEO, routeMeta } from '../seo/buildMeta';
import type { EnabledFeatures } from '../types';

export async function loader({ request, context }: Route.LoaderArgs) {
  const { language, t, client } = await createLoaderRequestContext(
    request,
    context.requestId
  );
  const queryClient = createLoaderQueryClient();

  // Request-scoped settings fetch (root loader runs in parallel; duplicate call).
  const { data: settings } = await fetchQueryOrNotFound<EnabledFeatures>(
    queryClient,
    {
      queryKey: ['settings', language],
      queryFn: () => fetchSettings(client),
    },
    () => false
  );

  if (settings?.programming !== true) {
    return data(
      { dehydratedState: dehydrate(queryClient), seo: NOT_FOUND_SEO },
      { status: 404 }
    );
  }

  return {
    dehydratedState: dehydrate(queryClient),
    seo: {
      title: t('programming.title'),
      description: t('programming.subtitle'),
    },
  };
}

export function meta({ data, matches, location }: Route.MetaArgs) {
  return routeMeta(data?.seo, matches[0].loaderData, location);
}

export default function Programming({ loaderData }: Route.ComponentProps) {
  return (
    <HydrationBoundary state={loaderData.dehydratedState}>
      <ProgrammingRoute />
    </HydrationBoundary>
  );
}
