import { createRequestHandler } from 'react-router';

declare module 'react-router' {
  export interface AppLoadContext {
    requestId: string;
    cloudflare: {
      env: Record<string, string>;
      ctx: { waitUntil(promise: Promise<unknown>): void };
    };
  }
}

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE
);

export default {
  async fetch(
    request: Request,
    env: Record<string, string>,
    ctx: { waitUntil(promise: Promise<unknown>): void }
  ): Promise<Response> {
    const start = Date.now();
    const requestId =
      request.headers.get('x-request-id')?.split(',')[0]?.trim() ||
      crypto.randomUUID();
    let status = 500;
    let error: unknown;
    try {
      const response = await requestHandler(request, {
        requestId,
        cloudflare: { env, ctx },
      });
      status = response.status;
      return response;
    } catch (e) {
      error = e;
      throw e;
    } finally {
      // Mirrors server/logging.js fields; only failures are logged here.
      if (error || status >= 500) {
        console.error(
          JSON.stringify({
            service: 'frontend-ssr',
            level: 'ERROR',
            kind: 'document',
            request_id: requestId,
            method: request.method,
            path: new URL(request.url).pathname,
            status,
            duration_ms: Date.now() - start,
            error: error instanceof Error ? error.message : undefined,
          })
        );
      }
    }
  },
};
