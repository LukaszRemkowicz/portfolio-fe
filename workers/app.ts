import { createRequestHandler } from 'react-router';
import { isMalformedRequestTarget } from '../src/server/requestTarget';

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
    if (isMalformedRequestTarget(request.url)) {
      console.warn(
        JSON.stringify({
          service: 'frontend-ssr',
          level: 'WARNING',
          event: 'request_rejected',
          kind: 'security_probe',
          request_id: requestId,
          method: request.method,
          path: request.url.slice(0, 2048),
          reason: 'malformed_request_target',
          status: 400,
        })
      );
      return new Response('Bad Request', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
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
      // Mirrors src/server/logging.ts fields; only failures are logged here.
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
