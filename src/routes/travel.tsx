import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { data } from 'react-router';
import type { Route } from './+types/travel';
import MainLayout from '../components/MainLayout';
import TravelHighlightsPage from '../components/TravelHighlightsPage';
import { NotFoundError } from '../api/errors';
import { getMediaUrl } from '../api/media';
import { fetchTravelHighlightDetail } from '../hooks/useTravelHighlightDetail';
import type { TravelHighlightDetail } from '../hooks/useTravelHighlightDetail';
import {
  createLoaderQueryClient,
  createLoaderRequestContext,
  fetchQueryOrNotFound,
} from '../utils/loaderData';
import { NOT_FOUND_SEO, routeMeta } from '../seo/buildMeta';
import type { RouteSeo } from '../seo/buildMeta';
import { stripHtml, truncateText } from '../utils/html';

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const { language, client } = await createLoaderRequestContext(
    request,
    context.requestId
  );
  const { countrySlug, placeSlug, dateSlug } = params;
  const queryClient = createLoaderQueryClient();

  const { data: detail, notFound } =
    await fetchQueryOrNotFound<TravelHighlightDetail>(
      queryClient,
      {
        queryKey: [
          'travel-highlight',
          language,
          countrySlug,
          placeSlug,
          dateSlug,
        ],
        queryFn: () =>
          fetchTravelHighlightDetail({
            countrySlug,
            placeSlug,
            dateSlug,
            clientOrTransport: client,
          }),
      },
      error => error instanceof NotFoundError
    );

  // Mirrors TravelHighlightsPage's former <SEO> (including its no-data fallbacks).
  const fullLocation = detail?.full_location || 'Travel Highlights';
  const plainStoryPreview = detail?.story ? stripHtml(detail.story).trim() : '';
  const seo: RouteSeo = {
    title: fullLocation,
    description: truncateText(
      String(
        detail?.highlight_title ||
          plainStoryPreview ||
          `Travel highlights from ${fullLocation}`
      ),
      160
    ),
    ogImage: detail?.background_image
      ? getMediaUrl(detail.background_image)
      : undefined,
  };

  // Missing entry: same UI as before, only the HTTP status changes (200 -> 404);
  // seo mirrors astrophotography.detail (generic title + noindex).
  if (notFound) {
    return data(
      {
        dehydratedState: dehydrate(queryClient),
        seo: NOT_FOUND_SEO as RouteSeo,
      },
      { status: 404 }
    );
  }
  return { dehydratedState: dehydrate(queryClient), seo };
}

export function meta({ data, matches, location }: Route.MetaArgs) {
  return routeMeta(data?.seo, matches[0].loaderData, location);
}

export default function Travel({ loaderData }: Route.ComponentProps) {
  return (
    <HydrationBoundary state={loaderData.dehydratedState}>
      <MainLayout>
        <TravelHighlightsPage />
      </MainLayout>
    </HydrationBoundary>
  );
}
