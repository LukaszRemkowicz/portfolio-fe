import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { data } from 'react-router';
import type { Route } from './+types/astrophotography.detail';
import { APP_ROUTES } from '../api/constants';
import { NotFoundError } from '../api/errors';
import { getMediaUrl } from '../api/media';
import { fetchAstroImageDetail } from '../api/services';
import {
  getAstroImageNotFoundQueryKey,
  getAstroImageQueryKey,
} from '../hooks/useAstroImageDetail';
import {
  createLoaderQueryClient,
  createLoaderRequestContext,
  fetchQueryOrNotFound,
} from '../utils/loaderData';
import { NOT_FOUND_SEO, routeMeta } from '../seo/buildMeta';
import type { RouteSeo } from '../seo/buildMeta';
import { stripHtml, truncateText } from '../utils/html';
import type { AstroImage } from '../types';

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const { language, t, client } = await createLoaderRequestContext(
    request,
    context.requestId
  );
  const slug = params.slug;
  const queryClient = createLoaderQueryClient();

  const { data: image, notFound } = await fetchQueryOrNotFound<AstroImage>(
    queryClient,
    {
      queryKey: getAstroImageQueryKey(language, slug),
      queryFn: () => fetchAstroImageDetail(slug, client),
    },
    error => error instanceof NotFoundError
  );

  if (notFound) {
    // Same flag the UI already reads to render NotFoundPage.
    queryClient.setQueryData(
      getAstroImageNotFoundQueryKey(language, slug),
      true
    );
    return data(
      {
        dehydratedState: dehydrate(queryClient),
        seo: NOT_FOUND_SEO as RouteSeo,
      },
      { status: 404 }
    );
  }

  return {
    dehydratedState: dehydrate(queryClient),
    seo: {
      title: image?.name || t('common.gallery'),
      description: truncateText(
        (image?.description ? stripHtml(image.description) : '').trim() ||
          image?.celestial_object ||
          image?.place?.name ||
          t('common.gallerySubtitle'),
        160
      ),
      ogImage: getMediaUrl(image?.fallback_image?.url || image?.url),
      url: image?.slug
        ? `${APP_ROUTES.ASTROPHOTOGRAPHY}/${image.slug}`
        : `${APP_ROUTES.ASTROPHOTOGRAPHY}/${slug}`,
    } satisfies RouteSeo as RouteSeo,
  };
}

// Same filter/tag/page inputs as the parent list; the slug is a route param.
export function meta({ data, matches, location }: Route.MetaArgs) {
  return routeMeta(data?.seo, matches[0].loaderData, location);
}

export default function AstrophotographyDetail({
  loaderData,
}: Route.ComponentProps) {
  return <HydrationBoundary state={loaderData.dehydratedState} />;
}
