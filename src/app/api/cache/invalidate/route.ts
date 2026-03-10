import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../backend/supabaseAdminClient';
import {
  getBearerTokenFromRequest,
  verifySupabaseToken,
} from '../../../../../backend/supabaseJwtVerifier';
import { invalidateEmergencyCache } from '@/lib/emergencyCache';

/**
 * POST /api/cache/invalidate
 * Called by the frontend after any profile / emergency-profile / medical-info update.
 * Busts the Redis cache for every QR token belonging to the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const bearerToken = getBearerTokenFromRequest(request);
    if (!bearerToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySupabaseToken(bearerToken);
    const userId = payload.sub;
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const { data: qrRows } = await supabaseAdmin
      .from('qr_codes')
      .select('token')
      .eq('profile_id', userId);

    if (qrRows && qrRows.length > 0) {
      await Promise.all(qrRows.map((qr) => invalidateEmergencyCache(qr.token)));
    }

    return NextResponse.json({ invalidated: qrRows?.length ?? 0 });
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    );
  }
}
