/**
 * True when the request target has invalid percent-encoding (port of
 * server/requestValidation.js assertValidRequestTarget). Such probes get a
 * compact 400 instead of reaching routing.
 */
export function isMalformedRequestTarget(requestUrl: string): boolean {
  try {
    const { pathname, search } = new URL(requestUrl);
    decodeURI(`${pathname}${search}` || '/');
    return false;
  } catch {
    return true;
  }
}
