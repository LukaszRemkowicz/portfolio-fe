type SentryModule = typeof import('@sentry/react');

let sentry: SentryModule | null = null;

/** Called once Sentry.init ran; until then (or with an empty DSN) capture is a no-op. */
export const setSentry = (mod: SentryModule | null): void => {
  sentry = mod;
};

/** Report a caught error (e.g. from an error boundary). Client-side only. */
export const captureError = (error: unknown): void => {
  sentry?.captureException(error);
};
