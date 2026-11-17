/* eslint-disable @typescript-eslint/no-explicit-any */
import { toPublicMediaPath } from '../../shared/media/publicMediaUrl';

/**
 * Normalize backend media URLs into frontend-safe public paths for BFF responses.
 */
export function normalizePublicMediaUrl<T>(value: T): T | string {
  if (typeof value !== 'string' || !value) {
    return value;
  }

  return toPublicMediaPath(value) ?? value;
}

export function normalizeBffPayload(payload: any, kind: string): any {
  if (!payload) return payload;

  if (kind !== 'images' && kind !== 'astroimages') {
    return payload;
  }

  if (
    kind === 'astroimages' &&
    payload.results &&
    Array.isArray(payload.results)
  ) {
    return {
      ...payload,
      results: payload.results.map((item: any) =>
        typeof item === 'object' && item.url
          ? { ...item, url: normalizePublicMediaUrl(item.url) }
          : item
      ),
    };
  }

  const data = payload;

  if (Array.isArray(data)) {
    return data.map((item: any) =>
      typeof item === 'object' && item.url
        ? { ...item, url: normalizePublicMediaUrl(item.url) }
        : item
    );
  }

  if (typeof data.url === 'string') {
    return {
      ...data,
      url: normalizePublicMediaUrl(data.url),
    };
  }

  if (typeof data === 'object' && !Array.isArray(data)) {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        normalizePublicMediaUrl(value),
      ])
    );
  }

  return data;
}
