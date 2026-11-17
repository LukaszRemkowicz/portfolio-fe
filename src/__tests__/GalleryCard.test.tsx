import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GalleryCard from '../components/common/GalleryCard';
import type { AstroImage } from '../types';

jest.mock('../api/services', () => ({ fetchAstroImageDetail: jest.fn() }));

const item = {
  pk: 1,
  slug: 'orion',
  name: 'Orion',
  description: 'Nebula',
  celestial_object: 'Deep Sky',
  created_at: '2000-01-01T00:00:00Z',
} as unknown as AstroImage;

describe('GalleryCard markup', () => {
  it('does not nest headings or paragraphs inside a button', () => {
    render(<GalleryCard item={item} onClick={jest.fn()} />);
    const button = screen.getByRole('button', {
      name: 'View details for Orion',
    });
    expect(button.querySelector('h3, p')).toBeNull();
    expect(button.closest('article')).toBe(
      screen.getByTestId('gallery-card-orion')
    );
    expect(screen.getByRole('heading', { name: 'Orion' })).toBeInTheDocument();
  });

  it('calls onClick once for a click on the button and on the card', () => {
    const onClick = jest.fn();
    render(<GalleryCard item={item} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /View details/ }));
    fireEvent.click(screen.getByTestId('gallery-card-orion'));
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(onClick).toHaveBeenCalledWith(item);
  });

  it('shows the NEW badge only for recent items, after mount', () => {
    const { rerender } = render(
      <GalleryCard item={item} onClick={jest.fn()} />
    );
    expect(screen.queryByText('NEW!')).toBeNull();
    rerender(
      <GalleryCard
        item={{ ...item, created_at: new Date().toISOString() }}
        onClick={jest.fn()}
      />
    );
    expect(screen.getByText('NEW!')).toBeInTheDocument();
  });
});
