import { buildMeta } from '../seo/buildMeta';

const base = {
  seoDefaults: { defaultTitle: 'Owner | Site', defaultDescription: 'Desc' },
  requestOrigin: 'https://portfolio.local',
  location: { pathname: '/', search: '' },
};

describe('buildMeta', () => {
  it('reproduces the default SEO tags for the home page, canonical last', () => {
    const tags = buildMeta(base);
    expect(tags[0]).toEqual({ title: 'Owner | Site' });
    expect(tags).toContainEqual({
      property: 'og:url',
      content: 'https://portfolio.local/',
    });
    expect(tags).toContainEqual({
      name: 'twitter:description',
      content: 'Desc',
    });
    expect(tags.at(-1)).toEqual({
      tagName: 'link',
      rel: 'canonical',
      href: 'https://portfolio.local/',
    });
    expect(tags.some(t => 'name' in t && t.name === 'robots')).toBe(false);
  });

  it('applies title prefix, robots, image and drops canonical when asked', () => {
    const tags = buildMeta({
      ...base,
      title: 'Not Found',
      robots: 'noindex, nofollow',
      ogImage: 'https://img/x.jpg',
      includeCanonical: false,
      location: { pathname: '/nope', search: '?a=1' },
    });
    expect(tags[0]).toEqual({ title: 'Not Found | Owner | Site' });
    expect(tags).toContainEqual({
      name: 'robots',
      content: 'noindex, nofollow',
    });
    expect(tags).toContainEqual({
      property: 'og:image',
      content: 'https://img/x.jpg',
    });
    expect(tags).toContainEqual({
      name: 'twitter:image',
      content: 'https://img/x.jpg',
    });
    expect(tags).toContainEqual({
      property: 'og:url',
      content: 'https://portfolio.local/nope?a=1',
    });
    expect(tags.some(t => 'tagName' in t)).toBe(false);
  });
});
