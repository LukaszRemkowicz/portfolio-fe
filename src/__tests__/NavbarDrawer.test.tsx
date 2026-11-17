import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import '@testing-library/jest-dom';
import Navbar from '../components/Navbar';
import { useFeatureFlags } from '../hooks/useFeatureFlag';

jest.mock('../api/services', () => ({ fetchSettings: jest.fn() }));
jest.mock('../hooks/useFeatureFlag', () => ({ useFeatureFlags: jest.fn() }));

const openDrawer = () => {
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByLabelText('Open menu'));
  expect(screen.getByLabelText('Close menu')).toHaveAttribute(
    'aria-expanded',
    'true'
  );
};

describe('Navbar mobile drawer', () => {
  beforeEach(() => {
    (useFeatureFlags as jest.Mock).mockReturnValue({
      isEnabled: () => false,
      isLoading: false,
    });
  });

  it('closes on Escape', () => {
    openDrawer();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByLabelText('Open menu')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('closes when the route changes', () => {
    openDrawer();
    const drawerLink = within(
      document.querySelector('[class*="mobileDrawer"]') as HTMLElement
    ).getByText('Astrophotography');
    fireEvent.click(drawerLink);
    expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
  });
});
