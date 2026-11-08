/** Set X-Request-ID on a response, cloning it when headers are immutable (no body buffering). */
export function withRequestId(response: Response, requestId: string): Response {
  try {
    response.headers.set('X-Request-ID', requestId);
    return response;
  } catch {
    const copy = new Response(response.body, response);
    copy.headers.set('X-Request-ID', requestId);
    return copy;
  }
}
