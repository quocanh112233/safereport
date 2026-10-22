import { withAuth } from '@/lib/auth/middleware';
import { ReportStore } from '@/lib/reports/store';
import { readBody, apiError } from '@/lib/reports/http';

const store = new ReportStore();

export const GET = withAuth(async (request, jwt) => {
  try {
    const requested = new URL(request.url).searchParams.get('user');
    const identity = requested && requested !== jwt.sub ? store.publicIdentity(requested) : store.identity(jwt.sub!);
    return Response.json({ identity }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
});

export const POST = withAuth(async (request, jwt) => {
  try {
    const body = await readBody(request, 40000);
    const identity = await store.register(jwt.sub!, body.publicKey as JsonWebKey, body.encryptedPrivateKey as string);
    return Response.json({ identity }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
});
