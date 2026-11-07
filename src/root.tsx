import { startTransition, useEffect, useState } from 'react';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRevalidator,
  useRouteLoaderData,
} from 'react-router';
import type { ShouldRevalidateFunction } from 'react-router';
import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
  dehydrate,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useTranslation } from 'react-i18next';
import type { Route } from './+types/root';
import './styles/global/index.css';
import { createApiClient } from './api/api';
import {
  fetchBackgroundImage,
  fetchLatestAstroImages,
  fetchProfile,
  fetchSettings,
  fetchTravelHighlights,
} from './api/services';
import { createServerI18n } from './i18n.server';
import { RequestOriginContext } from './context/RequestOriginContext';
import { useGoogleAnalytics } from './hooks/useGoogleAnalytics';
import { hasAnalyticsConsent } from './utils/analytics';
import { getRequestLanguage, getRequestOrigin } from './utils/requestMeta';
import ClientDocumentGuards from './components/common/ClientDocumentGuards';
import ClientOnly from './components/common/ClientOnly';
import CookieConsent from './components/common/CookieConsent';
import AppErrorBoundary, {
  ErrorFallback,
} from './components/common/ErrorBoundary';
import ScrollToHash from './components/common/ScrollToHash';
import {
  CRITICAL_CSS,
  FONT_FACE_CSS,
  LANGUAGE_BOOTSTRAP_SCRIPT,
} from './criticalHead';
import styles from './styles/components/App.module.css';
import { publicEnv, resolvePublicEnv } from '../server/publicEnv.js';
import { logWarning, toErrorPayload } from '../server/logging.js';

/** Escape serialized state for safe inline HTML embedding (server/documentRender.js). */
function serializeForHtml(state: unknown): string {
  return JSON.stringify(state)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

async function prefetchQuerySafely(
  queryClient: QueryClient,
  options: Parameters<QueryClient['prefetchQuery']>[0]
) {
  try {
    await queryClient.prefetchQuery(options);
  } catch (error) {
    logWarning({
      event: 'prefetch_failed',
      query_key: options.queryKey,
      ...toErrorPayload(error),
    });
  }
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const language = getRequestLanguage(request);
  const requestOrigin = getRequestOrigin(request);
  const requestPublicEnv = resolvePublicEnv({
    ...publicEnv,
    SITE_DOMAIN: new URL(requestOrigin).host,
  });

  // Request-scoped; the in-memory SSR shell cache is intentionally gone.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Discarded after this request; the browser hydrates into its own client.
        staleTime: Infinity,
      },
    },
  });
  const client = createApiClient(
    () => language,
    requestOrigin,
    context.requestId
  );

  const [i18n] = await Promise.all([
    createServerI18n(language),
    prefetchQuerySafely(queryClient, {
      queryKey: ['settings', language],
      queryFn: () => fetchSettings(client),
    }),
    prefetchQuerySafely(queryClient, {
      queryKey: ['profile', language],
      queryFn: () => fetchProfile(client),
    }),
    prefetchQuerySafely(queryClient, {
      queryKey: ['background', language],
      queryFn: () => fetchBackgroundImage(client),
    }),
    prefetchQuerySafely(queryClient, {
      queryKey: ['travel-highlights', language],
      queryFn: () => fetchTravelHighlights(client),
    }),
    prefetchQuerySafely(queryClient, {
      queryKey: ['latest-astro-images', language],
      queryFn: () => fetchLatestAstroImages(client),
    }),
  ]);

  const ownerName = requestPublicEnv.PROJECT_OWNER;

  return {
    language,
    requestOrigin,
    publicEnv: { ...requestPublicEnv },
    seoDefaults: {
      defaultTitle: i18n.t('meta.defaultTitle', {
        ownerName,
        defaultValue: `${ownerName} | Portfolio & Astrophotography`,
      }),
      defaultDescription: i18n.t('meta.defaultDescription', {
        ownerName,
        defaultValue: `Personal portfolio and astrophotography gallery of ${ownerName}.`,
      }),
    },
    dehydratedState: dehydrate(queryClient),
  };
}

// Skip revalidation on navigation (shell data is refreshed client-side by TanStack
// Query); same-URL revalidations (language switch) reload language/meta/shell data.
export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}) => (currentUrl.href === nextUrl.href ? defaultShouldRevalidate : false);

export function headers() {
  return {
    'Cache-Control': 'private, no-cache, must-revalidate',
    Vary: 'Cookie, Accept-Language',
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>('root');
  const language = data?.language ?? 'en';
  const env = data?.publicEnv;

  return (
    <html lang={language}>
      <head>
        <meta charSet='UTF-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        <link
          rel='preload'
          href='/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2'
          as='font'
          type='font/woff2'
          crossOrigin=''
        />
        <link
          rel='preload'
          href='/fonts/V8mDoQDjQSkFtoMM3T6r8E7mPbF4C_k3HqU.woff2'
          as='font'
          type='font/woff2'
          crossOrigin=''
        />
        <meta name='theme-color' content='#02040a' />
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />
        <style dangerouslySetInnerHTML={{ __html: FONT_FACE_CSS }} />
        <link rel='icon' href='/favicon.ico' />
        <link rel='apple-touch-icon' href='/logo192.png' />
        <Meta />
        <Links />
        {env && (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__PUBLIC_ENV__ = ${serializeForHtml({
                API_URL: env.API_URL,
                GA_TRACKING_ID: env.GA_TRACKING_ID,
                ENABLE_GA: env.ENABLE_GA,
                SENTRY_DSN_FE: env.SENTRY_DSN_FE,
                ENVIRONMENT: env.ENVIRONMENT,
                PROJECT_OWNER: env.PROJECT_OWNER,
                SITE_DOMAIN: env.SITE_DOMAIN,
              })};`,
            }}
          />
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__INITIAL_LANGUAGE__ = ${JSON.stringify(language)};`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{ __html: LANGUAGE_BOOTSTRAP_SCRIPT }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Client-only: renders null, wires GA on the client
function AnalyticsTracker({ hasConsented }: { hasConsented: boolean }) {
  useGoogleAnalytics(hasConsented);
  return null;
}

export default function Root({ loaderData }: Route.ComponentProps) {
  const { i18n } = useTranslation();
  const { revalidate } = useRevalidator();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 2, refetchOnWindowFocus: false },
        },
      })
  );
  const [hasConsented, setHasConsented] = useState(() => hasAnalyticsConsent());

  // Invalidate all queries on language change so server-translated data is re-fetched
  useEffect(() => {
    const onLanguageChanged = () => {
      startTransition(() => {
        void queryClient.invalidateQueries();
      });
      // LanguageSwitcher writes the i18next cookie before changeLanguage, so the
      // root loader now returns the new language, <html lang> and SEO meta.
      void revalidate();
    };
    i18n.on('languageChanged', onLanguageChanged);
    return () => {
      i18n.off('languageChanged', onLanguageChanged);
    };
  }, [i18n, queryClient, revalidate]);

  return (
    <QueryClientProvider client={queryClient}>
      <RequestOriginContext.Provider value={loaderData.requestOrigin}>
        <HydrationBoundary state={loaderData.dehydratedState}>
          <ClientOnly>
            <AnalyticsTracker hasConsented={hasConsented} />
            <ScrollToHash />
            <ClientDocumentGuards />
            {import.meta.env.DEV && (
              <ReactQueryDevtools initialIsOpen={false} />
            )}
          </ClientOnly>
          <div className={`${styles.appContainer} ${styles.astroBg}`}>
            <AppErrorBoundary>
              <Outlet />
            </AppErrorBoundary>
          </div>
          <ClientOnly>
            <CookieConsent onAccept={() => setHasConsented(true)} />
          </ClientOnly>
        </HydrationBoundary>
      </RequestOriginContext.Provider>
    </QueryClientProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  console.error('Uncaught error:', error);
  return (
    <div className={`${styles.appContainer} ${styles.astroBg}`}>
      <ErrorFallback />
    </div>
  );
}
