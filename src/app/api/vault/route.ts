import { withAuth } from '@/lib/auth/middleware';

// Preserve the template URL without exposing its replaced vault storage.
export const GET = withAuth(async () => Response.json({ error: 'The personal vault has been replaced by SafeReport. Open the workspace at /.' }, { status: 410 }));
