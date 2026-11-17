import { act } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import '@testing-library/jest-dom';
import AstroGallery from '../components/AstroGallery';
import { useAstroImages } from '../hooks/useAstroImages';
import { useCategories } from '../hooks/useCategories';
import { useTags } from '../hooks/useTags';
import { useBackground } from '../hooks/useBackground';
import { useAstroImageDetail } from '../hooks/useAstroImageDetail';
import { useImageUrls } from '../hooks/useImageUrls';

jest.mock('../hooks/useAstroImages', () => ({
  ASTRO_GALLERY_MAX_LIMIT: 48,
  useAstroImages: jest.fn(),
}));
jest.mock('../hooks/useCategories');
jest.mock('../hooks/useTags');
jest.mock('../hooks/useBackground');
jest.mock('../hooks/useAstroImageDetail');
jest.mock('../hooks/useImageUrls');

type ObserverInstance = {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observe: jest.Mock;
  disconnect: jest.Mock;
};

const image = {
  pk: 1,
  slug: 'one',
  name: 'One',
  description: 'd',
  celestial_object: 'Deep Sky',
  created_at: '2000-01-01T00:00:00Z',
};

describe('AstroGallery behaviour', () => {
  const observers: ObserverInstance[] = [];
  const fetchNextPage = jest.fn();

  const setup = (search = '', hasNextPage = true) => {
    (useAstroImages as jest.Mock).mockReturnValue({
      data: [image],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage,
      fetchNextPage,
      error: null,
    });
    return act(async () => {
      render(
        <MemoryRouter initialEntries={[`/${search}`]}>
          <Routes>
            <Route path='/' element={<AstroGallery />} />
          </Routes>
        </MemoryRouter>
      );
    });
  };

  beforeEach(() => {
    jest.resetAllMocks();
    observers.length = 0;
    (useBackground as jest.Mock).mockReturnValue({ data: null });
    (useImageUrls as jest.Mock).mockReturnValue({ data: {} });
    (useTags as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    (useCategories as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
    (useAstroImageDetail as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    global.IntersectionObserver = jest.fn(function (
      this: ObserverInstance,
      callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit
    ) {
      Object.assign(this, {
        callback,
        options,
        observe: jest.fn(),
        disconnect: jest.fn(),
      });
      observers.push(this);
    }) as unknown as typeof IntersectionObserver;
  });

  it('loads the next page when the sentinel intersects', async () => {
    await setup();
    fetchNextPage.mockClear(); // bootstrap fill may have called it already
    expect(observers).toHaveLength(1);
    expect(observers[0].options?.rootMargin).toBe('0px 0px 240px 0px');
    expect(observers[0].observe).toHaveBeenCalledTimes(1);

    observers[0].callback(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    expect(fetchNextPage).not.toHaveBeenCalled();

    observers[0].callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('does not observe when there is no next page or a fixed ?page= is shown', async () => {
    await setup('', false);
    expect(observers).toHaveLength(0);
  });

  it('caps ?limit= to the API maximum and ignores values below 1', async () => {
    await setup('?limit=500');
    expect((useAstroImages as jest.Mock).mock.calls[0][0].limit).toBe(48);
  });

  it('ignores a zero limit', async () => {
    await setup('?limit=0.4');
    expect(
      (useAstroImages as jest.Mock).mock.calls[0][0].limit
    ).toBeUndefined();
  });

  it('does not auto-scroll to the results on first mount (mobile width)', async () => {
    const original = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 400,
    });
    const scrollTo = jest
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => undefined);
    await setup('?filter=deep-sky');
    expect(screen.getByTestId('gallery-card-one')).toBeInTheDocument();
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    expect(scrollTo).not.toHaveBeenCalled();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: original,
    });
    scrollTo.mockRestore();
  });
});
