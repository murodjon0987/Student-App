export class RequestBodyError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Bound the bytes read, including requests without a Content-Length header. */
export async function readBodyBytes(request: Pick<Request, "headers" | "body">, maxBytes: number) {
  const length = Number(request.headers.get("content-length"));
  if (length > maxBytes) throw new RequestBodyError("So'rov juda katta", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError("So'rov bo'sh", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestBodyError("So'rov juda katta", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function readJsonBody(request: Pick<Request, "headers" | "body">, maxBytes = 32_768): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new RequestBodyError("JSON so'rov yuboring", 415);
  }
  const bytes = await readBodyBytes(request, maxBytes);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new RequestBodyError("Noto'g'ri JSON so'rov", 400);
  }
}
