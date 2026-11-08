import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { data } from 'react-router';
import type { Route } from './+types/shop';
import ShopRoute from '../components/ShopRoute';
import { APP_ROUTES } from '../api/constants';
import { fetchSettings, fetchShopProducts } from '../api/services';
import {
  createLoaderQueryClient,
  createLoaderRequestContext,
  fetchQueryOrNotFound,
  prefetchQuerySafely,
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

  if (settings?.shop !== true) {
    return data(
      { dehydratedState: dehydrate(queryClient), seo: NOT_FOUND_SEO },
      { status: 404 }
    );
  }

  await prefetchQuerySafely(queryClient, {
    queryKey: ['shop-products'],
    queryFn: () => fetchShopProducts(client),
  });

  return {
    dehydratedState: dehydrate(queryClient),
    seo: {
      title: t('shop.metaTitle'),
      description: t('shop.metaDescription'),
      url: APP_ROUTES.SHOP,
    },
  };
}

export function meta({ data, matches, location }: Route.MetaArgs) {
  return routeMeta(data?.seo, matches[0].loaderData, location);
}

export default function Shop({ loaderData }: Route.ComponentProps) {
  return (
    <HydrationBoundary state={loaderData.dehydratedState}>
      <ShopRoute />
    </HydrationBoundary>
  );
}
