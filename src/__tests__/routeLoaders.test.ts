import { NotFoundError } from '../api/errors';
import { buildMeta, routeMeta } from '../seo/buildMeta';
import { loader as astroLoader } from '../routes/astrophotography';
import { loader as astroDetailLoader } from '../routes/astrophotography.detail';
import { loader as travelLoader } from '../routes/travel';
import { loader as shopLoader } from '../routes/shop';
import { loader as programmingLoader } from '../routes/programming';
import { loader as privacyLoader } from '../routes/privacy';
import {
  fetchAstroImageDetail,
  fetchAstroImages,
  fetchCategories,
  fetchSettings,
  fetchShopProducts,
  fetchTags,
} from '../api/services';
import { fetchTravelHighlightDetail } from '../hooks/useTravelHighlightDetail';

jest.mock('../api/services');
jest.mock('../hooks/useTravelHighlightDetail', () => ({
  ...jest.requireActual('../hooks/useTravelHighlightDetail'),
  fetchTravelHighlightDetail: jest.fn(),
}));

// jsdom has no Request; loaders only need `url` and `headers.get`.
const fakeRequest = (path: string, headers: Record<string, string> = {}) =>
  ({
    url: `https://portfolio.local${path}`,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  }) as unknown as Request;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const run = (loader: any, path: string, params = {}, lang = 'en') =>
  loader({
    request: fakeRequest(path, { cookie: `i18next=${lang}` }),
    params,
    context: { requestId: 'test-request' },
  });

const status = (result: unknown) =>
  (result as { init?: { status?: number } }).init?.status ?? 200;
const body = (result: unknown) =>
  ((result as { data?: unknown }).data ?? result) as {
    dehydratedState: { queries: Array<{ queryKey: unknown[] }> };
    seo: Record<string, unknown>;
  };
const keys = (result: unknown) =>
  body(result).dehydratedState.queries.map(q => JSON.stringify(q.queryKey));

describe('route loaders', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('astrophotography prefetches categories (hook key), tags and images, canonical per page', async () => {
    (fetchCategories as jest.Mock).mockResolvedValue(['deep-sky']);
    (fetchTags as jest.Mock).mockResolvedValue([]);
    (fetchAstroImages as jest.Mock).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    const result = await run(
      astroLoader,
      '/astrophotography?filter=deep-sky&page=2'
    );

    expect(keys(result)).toEqual(
      expect.arrayContaining([
        '["categories","en"]',
        '["tags","en","deep-sky"]',
        '["astro-images","en",{"filter":"deep-sky","page":2}]',
      ])
    );
    expect(fetchAstroImages).toHaveBeenCalledWith(
      expect.objectContaining({ filter: 'deep-sky', page: 2, limit: 15 }),
      expect.anything()
    );
    expect(body(result).seo.url).toBe('/astrophotography?page=2');
    const tags = routeMeta(
      body(result).seo,
      {
        seoDefaults: { defaultTitle: 'Site', defaultDescription: 'Desc' },
        requestOrigin: 'https://portfolio.local',
      },
      { pathname: '/astrophotography', search: '?filter=deep-sky&page=2' }
    );
    expect(tags).toContainEqual({
      tagName: 'link',
      rel: 'canonical',
      href: 'https://portfolio.local/astrophotography?page=2',
    });
  });

  it('astro detail: 200 with image seo, 404 plus not-found flag when missing', async () => {
    (fetchAstroImageDetail as jest.Mock).mockResolvedValueOnce({
      slug: 'orion',
      name: 'Orion',
      description: '<p>Nebula</p>',
    });
    const ok = await run(astroDetailLoader, '/astrophotography/orion', {
      slug: 'orion',
    });
    expect(status(ok)).toBe(200);
    expect(body(ok).seo).toMatchObject({
      title: 'Orion',
      description: 'Nebula',
      url: '/astrophotography/orion',
    });

    (fetchAstroImageDetail as jest.Mock).mockRejectedValueOnce(
      new NotFoundError()
    );
    const missing = await run(astroDetailLoader, '/astrophotography/nope', {
      slug: 'nope',
    });
    expect(status(missing)).toBe(404);
    expect(keys(missing)).toContain('["astro-image-not-found","en","nope"]');
    expect(body(missing).seo.robots).toBe('noindex, nofollow');
  });

  it('travel: 404 only when the backend says not found', async () => {
    const params = { countrySlug: 'x', placeSlug: 'y', dateSlug: '2020-01-01' };
    (fetchTravelHighlightDetail as jest.Mock).mockRejectedValueOnce(
      new NotFoundError()
    );
    const missing = await run(travelLoader, '/travel/x/y/2020-01-01', params);
    expect(status(missing)).toBe(404);
    expect(body(missing).seo).toMatchObject({ title: 'Travel Highlights' });

    (fetchTravelHighlightDetail as jest.Mock).mockResolvedValueOnce({
      full_location: 'Krakow, Poland',
      highlight_title: 'Trip',
      images: [],
    });
    const ok = await run(travelLoader, '/travel/x/y/2020-01-01', params);
    expect(status(ok)).toBe(200);
    expect(keys(ok)).toContain(
      '["travel-highlight","en","x","y","2020-01-01"]'
    );
    expect(body(ok).seo).toMatchObject({
      title: 'Krakow, Poland',
      description: 'Trip',
    });
  });

  it.each([
    ['shop', shopLoader],
    ['programming', programmingLoader],
  ] as const)(
    '%s: 404 when the feature flag is off or settings fail',
    async (flag, loader) => {
      (fetchSettings as jest.Mock).mockResolvedValueOnce({ [flag]: false });
      expect(status(await run(loader, `/${flag}`))).toBe(404);

      (fetchSettings as jest.Mock).mockRejectedValueOnce(new Error('down'));
      expect(status(await run(loader, `/${flag}`))).toBe(404);

      (fetchSettings as jest.Mock).mockResolvedValueOnce({ [flag]: true });
      (fetchShopProducts as jest.Mock).mockResolvedValue({ products: [] });
      const on = await run(loader, `/${flag}`);
      expect(status(on)).toBe(200);
      expect(keys(on).includes('["shop-products"]')).toBe(flag === 'shop');
    }
  );

  it('privacy returns translated seo', async () => {
    const pl = await run(privacyLoader, '/privacy', {}, 'pl');
    expect(body(pl).seo.title).toBeTruthy();
  });

  it('buildMeta still builds the default tags', () => {
    expect(
      buildMeta({
        seoDefaults: { defaultTitle: 'T', defaultDescription: 'D' },
        requestOrigin: 'https://a.test',
        location: { pathname: '/x', search: '' },
      })[0]
    ).toEqual({ title: 'T' });
  });
});
