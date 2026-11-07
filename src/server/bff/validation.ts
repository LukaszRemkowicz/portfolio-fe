export const MAX_JSON_BODY_BYTES = 64 * 1024;

export class RequestValidationError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'RequestValidationError';
    this.statusCode = statusCode;
  }
}

/** 415 unless the request declares `application/json`. */
export function assertJsonContentType(request: Request): void {
  const contentType = (request.headers.get('content-type') || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

  if (contentType !== 'application/json') {
    throw new RequestValidationError(
      415,
      'Unsupported Media Type. Expected application/json.'
    );
  }
}

/** Read and parse a JSON body; 413 above the size limit, 400 when malformed. */
export async function readJsonBody(request: Request): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  if (request.body) {
    const reader = request.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_JSON_BODY_BYTES) {
        void reader.cancel();
        throw new RequestValidationError(
          413,
          `Request body exceeds ${MAX_JSON_BODY_BYTES} bytes.`
        );
      }
      chunks.push(value);
    }
  }

  if (chunks.length === 0) {
    return null;
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const rawBody = new TextDecoder().decode(bytes);

  try {
    return rawBody ? JSON.parse(rawBody) : null;
  } catch {
    throw new RequestValidationError(400, 'Malformed JSON request body.');
  }
}
