import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ScrollToHash from '../components/common/ScrollToHash';

describe('ScrollToHash', () => {
  const scrollIntoView = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    scrollIntoView.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
    document.body.innerHTML = '';
  });
  afterEach(() => jest.useRealTimers());

  const mount = (entry: string) =>
    render(
      <MemoryRouter initialEntries={[entry]}>
        <ScrollToHash />
      </MemoryRouter>
    );

  it('never scrolls to the top itself (ScrollRestoration owns positions)', () => {
    const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation();
    mount('/astrophotography');
    expect(scrollTo).not.toHaveBeenCalled();
    scrollTo.mockRestore();
  });

  it('leaves an anchor that already exists to ScrollRestoration', () => {
    document.body.innerHTML = '<div id="contact"></div>';
    mount('/#contact');
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('scrolls once to an anchor that mounts late, then stops observing', async () => {
    mount('/#contact');
    await act(async () => {
      const el = document.createElement('div');
      el.id = 'contact';
      document.body.appendChild(el);
    });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    await act(async () => {
      document.body.appendChild(document.createElement('p'));
    });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('gives up after the wait window', async () => {
    mount('/#contact');
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    await act(async () => {
      const el = document.createElement('div');
      el.id = 'contact';
      document.body.appendChild(el);
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
