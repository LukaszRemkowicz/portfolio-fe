import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Outlet } from 'react-router';
import type { ShouldRevalidateFunction } from 'react-router';
import type { Route } from './+types/astrophotography';
import AstroGallery from '../components/AstroGallery';
import MainLayout from '../components/MainLayout';
import { APP_ROUTES } from '../api/constants';
import { fetchAstroImages, fetchCategories, fetchTags } from '../api/services';
import { ASTRO_GALLERY_PAGE_SIZE } from '../hooks/useAstroImages';
import {
  createLoaderQueryClient,
  createLoaderRequestContext,
  prefetchInfiniteQuerySafely,
  prefetchQuerySafely,
} from '../utils/loaderData';
import { routeMeta } from '../seo/buildMeta';
import { truncateText } from '../utils/html';

export async function loader({ request, context }: Route.LoaderArgs) {
  const { language, t, client } = await createLoaderRequestContext(
    request,
    context.requestId
  );
  const { searchParams } = new URL(request.url);
  const selectedFilter = searchParams.get('filter') || undefined;
  const selectedTag = searchParams.get('tag') || undefined;
  const rawPage = searchParams.get('page');
  const selectedPage =
    rawPage && Number.isFinite(Number(rawPage)) && Number(rawPage) >= 1
      ? Math.floor(Number(rawPage))
      : undefined;
  const imageParams = {
    ...(selectedFilter ? { filter: selectedFilter } : {}),
    ...(selectedTag ? { tag: selectedTag } : {}),
    ...(selectedPage ? { page: selectedPage } : {}),
  };

  const queryClient = createLoaderQueryClient();
  await Promise.all([
    prefetchQuerySafely(queryClient, {
      queryKey: ['categories', language],
      queryFn: () => fetchCategories(client),
    }),
    prefetchQuerySafely(queryClient, {
      queryKey: ['tags', language, selectedFilter],
      queryFn: () => fetchTags({ filter: selectedFilter }, client),
    }),
    prefetchInfiniteQuerySafely(queryClient, {
      queryKey: ['astro-images', language, imageParams],
      initialPageParam: selectedPage ?? 1,
      queryFn: ({ pageParam }) =>
        fetchAstroImages(
          {
            ...imageParams,
            page: Number(pageParam),
            limit: ASTRO_GALLERY_PAGE_SIZE,
          },
          client
        ),
    }),
  ]);

  return {
    dehydratedState: dehydrate(queryClient),
    seo: {
      title: t('common.gallery'),
      description: truncateText(t('common.gallerySubtitle'), 160),
      url:
        selectedPage && selectedPage > 1
          ? `${APP_ROUTES.ASTROPHOTOGRAPHY}?page=${selectedPage}`
          : APP_ROUTES.ASTROPHOTOGRAPHY,
    },
  };
}

// Opening/closing the image modal (child route, other query params) must not
// re-run the list prefetch; only its inputs (filter/tag/page) or a same-URL
// revalidation (language switch) do.
export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}) => {
  if (currentUrl.href === nextUrl.href) return defaultShouldRevalidate;
  return ['filter', 'tag', 'page'].some(
    key => currentUrl.searchParams.get(key) !== nextUrl.searchParams.get(key)
  );
};

export function meta({ data, matches, location }: Route.MetaArgs) {
  return routeMeta(data?.seo, matches[0].loaderData, location);
}

export default function Astrophotography({ loaderData }: Route.ComponentProps) {
  return (
    <HydrationBoundary state={loaderData.dehydratedState}>
      {/* Child (detail) route renders no DOM; it comes first so its query data is hydrated before the gallery reads it. */}
      <Outlet />
      <MainLayout>
        <AstroGallery />
      </MainLayout>
    </HydrationBoundary>
  );
}
