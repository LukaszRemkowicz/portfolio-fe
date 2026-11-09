import { getMediaPassthroughUrl } from '../server/mediaPassthrough';

const ORIGIN = 'https://media.example.com';

describe('getMediaPassthroughUrl', () => {
  it('is off without MEDIA_ORIGIN', () => {
    expect(getMediaPassthroughUrl('https://t.dev/media/a.webp', '')).toBeNull();
  });

  it('maps /media/* to the media origin, keeping the query', () => {
    expect(
      getMediaPassthroughUrl('https://t.dev/media/a.webp?v=1', ORIGIN)
    ).toBe(`${ORIGIN}/media/a.webp?v=1`);
  });

  it('ignores other paths, including traversal out of /media', () => {
    expect(
      getMediaPassthroughUrl('https://t.dev/app/profile/', ORIGIN)
    ).toBeNull();
    expect(
      getMediaPassthroughUrl('https://t.dev/media/../v1/x', ORIGIN)
    ).toBeNull();
  });
});
