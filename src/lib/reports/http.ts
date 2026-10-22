import { InputError } from './store.ts';

export async function readBody(request: Request, limit = 131072): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new InputError('Request body is required.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) { await reader.cancel(); throw new InputError('Request is too large.', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new InputError('Request must be a JSON object.'); }
}

export function apiError(error: unknown): Response {
  if (error instanceof InputError) return Response.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  console.error('SafeReport storage operation failed:', error instanceof Error ? error.name : 'UnknownError');
  return Response.json({ error: 'Could not access stored data. Try again; your existing data has not been reset.' }, { status: 500 });
}
