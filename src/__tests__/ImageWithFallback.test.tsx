import { render, screen } from '@testing-library/react';
import ImageWithFallback from '../components/common/ImageWithFallback';

describe('ImageWithFallback', () => {
  it('recovers from an initial empty src when a real src arrives later', () => {
    const { rerender } = render(
      <ImageWithFallback src='' alt='Travel card' fallbackSrc='/fallback.jpg' />
    );

    expect(screen.getByAltText('Travel card')).toHaveAttribute(
      'src',
      '/fallback.jpg'
    );

    rerender(
      <ImageWithFallback
        src='/real-image.jpg'
        alt='Travel card'
        fallbackSrc='/fallback.jpg'
      />
    );

    expect(screen.getByAltText('Travel card')).toHaveAttribute(
      'src',
      '/real-image.jpg'
    );
  });

  it('can avoid showing a fallback while src is temporarily empty', () => {
    render(
      <ImageWithFallback
        src=''
        alt='Modal image'
        fallbackSrc='/fallback.jpg'
        fallbackOnEmptySrc={false}
      />
    );

    expect(screen.getByAltText('Modal image')).not.toHaveAttribute('src');
  });

  it('calls onLoad once per src even with a new inline callback each render', () => {
    const calls = jest.fn();
    const { rerender } = render(
      <ImageWithFallback src='/a.jpg' alt='x' onLoad={() => calls()} />
    );
    const img = screen.getByAltText('x') as HTMLImageElement;
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: 10 });
    rerender(<ImageWithFallback src='/b.jpg' alt='x' onLoad={() => calls()} />);
    const after = calls.mock.calls.length;
    rerender(<ImageWithFallback src='/b.jpg' alt='x' onLoad={() => calls()} />);
    rerender(<ImageWithFallback src='/b.jpg' alt='x' onLoad={() => calls()} />);
    expect(calls.mock.calls.length).toBe(after);
    expect(after).toBe(1);
  });
});
