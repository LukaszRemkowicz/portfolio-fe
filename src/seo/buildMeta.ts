import type { MetaDescriptor } from 'react-router';

/** Translated site-wide defaults, computed once per request by the root loader. */
export interface SeoDefaults {
  defaultTitle: string;
  defaultDescription: string;
}

/** Route-specific SEO inputs computed by loaders (translated strings live there). */
export interface RouteSeo {
  title?: string | null;
  description?: string | null;
  ogImage?: string | null;
  url?: string | null;
  robots?: string | null;
  includeCanonical?: boolean;
}

/** What NotFoundPage's <SEO> produced. */
export const NOT_FOUND_SEO: RouteSeo = {
  title: 'Page Not Found',
  description: 'The requested page could not be found on this site.',
  robots: 'noindex, nofollow',
  includeCanonical: false,
};

/** Meta for a route: its loader's `seo` plus root loader data (origin, defaults). */
export function routeMeta(
  seo: RouteSeo | undefined,
  root: { seoDefaults: SeoDefaults; requestOrigin: string } | undefined,
  location: { pathname: string; search: string }
): MetaDescriptor[] {
  if (!seo || !root) return [];
  return buildMeta({
    ...seo,
    seoDefaults: root.seoDefaults,
    requestOrigin: root.requestOrigin,
    location,
  });
}

export interface BuildMetaOptions {
  title?: string | null;
  description?: string | null;
  ogImage?: string | null;
  /** Route path (+ search); defaults to `location`. */
  url?: string | null;
  robots?: string | null;
  includeCanonical?: boolean;
  /** Route-meta inputs: root loader data and the current location. */
  seoDefaults: SeoDefaults;
  requestOrigin: string;
  location: { pathname: string; search: string };
}

/** Same tags and order the former react-helmet <SEO> component rendered. */
export function buildMeta({
  title,
  description,
  ogImage,
  url,
  robots,
  includeCanonical = true,
  seoDefaults,
  requestOrigin,
  location,
}: BuildMetaOptions): MetaDescriptor[] {
  const finalTitle = title
    ? `${title} | ${seoDefaults.defaultTitle}`
    : seoDefaults.defaultTitle;
  const finalDescription = description || seoDefaults.defaultDescription;
  const routePath = url || `${location.pathname}${location.search}`;
  const finalUrl = new URL(routePath || '/', requestOrigin).toString();

  return [
    { title: finalTitle },
    { name: 'description', content: finalDescription },
    ...(robots ? [{ name: 'robots', content: robots }] : []),
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: finalUrl },
    { property: 'og:title', content: finalTitle },
    { property: 'og:description', content: finalDescription },
    ...(ogImage ? [{ property: 'og:image', content: ogImage }] : []),
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:url', content: finalUrl },
    { name: 'twitter:title', content: finalTitle },
    { name: 'twitter:description', content: finalDescription },
    ...(ogImage ? [{ name: 'twitter:image', content: ogImage }] : []),
    ...(includeCanonical
      ? [{ tagName: 'link' as const, rel: 'canonical', href: finalUrl }]
      : []),
  ];
}
