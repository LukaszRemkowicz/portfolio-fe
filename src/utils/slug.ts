/** Strict route-param check: rejects `.`, `..`, `%`, `?`, `/` before a param reaches an upstream path. */
export const isSafeSlug = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value);
