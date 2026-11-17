import { render, screen } from '@testing-library/react';
import { getDateSlug, isWithinDays, useIsRecent } from '../../utils/date';

describe('getDateSlug (UTC, time-zone independent)', () => {
  it('uses UTC month/year at month and year boundaries', () => {
    // 23:30Z on Dec 31 is already Jan 1 in UTC+1 and still Dec 31 in UTC-5.
    expect(getDateSlug('2025-12-31T23:30:00Z')).toBe('dec2025');
    expect(getDateSlug('2026-01-01T00:30:00Z')).toBe('jan2026');
    expect(getDateSlug('2026-03-01')).toBe('mar2026');
  });

  it('returns null for empty or invalid input', () => {
    expect(getDateSlug(undefined)).toBeNull();
    expect(getDateSlug('not-a-date')).toBeNull();
  });
});

describe('isWithinDays', () => {
  const now = Date.parse('2026-01-15T12:00:00Z');
  it('compares against an explicit clock', () => {
    expect(isWithinDays('2026-01-10T12:00:00Z', 7, now)).toBe(true);
    expect(isWithinDays('2026-01-01T12:00:00Z', 7, now)).toBe(false);
    expect(isWithinDays(undefined, 7, now)).toBe(false);
    expect(isWithinDays('garbage', 7, now)).toBe(false);
  });
});

describe('useIsRecent', () => {
  const Probe = ({ date }: { date: string }) => (
    <span>{useIsRecent(date, 7) ? 'new' : 'old'}</span>
  );

  it('is false in server rendering (hydration-safe) and true on the client for recent dates', () => {
    const { renderToString } = require('react-dom/server');
    const recent = new Date().toISOString();
    expect(renderToString(<Probe date={recent} />)).toContain('old');

    render(<Probe date={recent} />);
    expect(screen.getByText('new')).toBeInTheDocument();
  });
});
