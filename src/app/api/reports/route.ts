import { withAuth } from '@/lib/auth/middleware';
import { ReportStore } from '@/lib/reports/store';
import { readBody, apiError } from '@/lib/reports/http';

const store = new ReportStore();

export const GET = withAuth(async (_request, jwt) => {
  try { return Response.json({ reports: store.list(jwt.sub!) }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return apiError(error); }
});

export const POST = withAuth(async (request, jwt) => {
  try { return Response.json({ report: store.save(jwt.sub!, await readBody(request)) }, { status: 201, headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return apiError(error); }
});
