import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import Programming from '../components/Programming';
import { Project } from '../types';
import { useProjects } from '../hooks/useProjects';

jest.mock('../hooks/useProjects');

describe('Programming Component', () => {
  const renderProgramming = () =>
    render(
      <MemoryRouter>
        <Programming />
      </MemoryRouter>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    (useProjects as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  it('renders the Project Archive title', () => {
    renderProgramming();
    expect(
      screen.getByRole('heading', { name: /Project Archive/i })
    ).toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
    (useProjects as jest.Mock).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    });

    renderProgramming();
    expect(screen.getAllByTestId('project-skeleton')).toHaveLength(3);
  });

  const baseProject: Project = {
    id: '1',
    name: 'Test Project',
    description: '<p>Test Description</p><script>alert(1)</script>',
    technologies: ['React', 'Node'],
    github_url: 'http://github.com',
    live_url: 'http://live.com',
    created_at: '2023-01-01T00:00:00Z',
    fallback_image: {
      url: '/test.webp',
      width: 800,
      height: 500,
      mime_type: 'image/webp',
    },
    variants: {},
  };

  const mockData = (projects: Project[]) =>
    (useProjects as jest.Mock).mockReturnValue({
      data: projects,
      isLoading: false,
      error: null,
    });

  it('renders project card with sanitized description, tech and links', () => {
    mockData([baseProject]);
    const { container } = renderProgramming();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByAltText('Test Project')).toHaveAttribute(
      'src',
      '/test.webp'
    );
    const source = screen.getByRole('link', { name: /Source/ });
    expect(source).toHaveAttribute('href', 'http://github.com');
    expect(source).toHaveAttribute('rel', 'noopener noreferrer');
    expect(source).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /Live Demo/ })).toHaveAttribute(
      'href',
      'http://live.com'
    );
  });

  it('renders price badge for free, paid and none', () => {
    mockData([{ ...baseProject, price_tag: { type: 'free' } }]);
    const { unmount } = renderProgramming();
    expect(screen.getByText('Free')).toBeInTheDocument();
    unmount();

    mockData([
      {
        ...baseProject,
        price_tag: { type: 'paid', amount: '49.00', currency: 'PLN' },
      },
    ]);
    const second = renderProgramming();
    expect(screen.getByText(/49/)).toHaveTextContent(/PLN|zł/);
    second.unmount();

    mockData([{ ...baseProject, price_tag: null }]);
    renderProgramming();
    expect(screen.queryByText('Free')).toBeNull();
    expect(screen.queryByText(/49/)).toBeNull();
  });

  it('renders the special badge only when set', () => {
    mockData([{ ...baseProject, badge: 'First on macOS' }]);
    const { unmount } = renderProgramming();
    expect(screen.getByText('First on macOS')).toBeInTheDocument();
    unmount();

    mockData([{ ...baseProject, badge: '' }]);
    renderProgramming();
    expect(screen.queryByText('First on macOS')).toBeNull();
  });

  it('hides links when urls are empty', () => {
    mockData([{ ...baseProject, github_url: '', live_url: undefined }]);
    renderProgramming();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders placeholder when there is no image', () => {
    mockData([{ ...baseProject, fallback_image: null }]);
    renderProgramming();
    expect(screen.queryByAltText('Test Project')).toBeNull();
  });
});
