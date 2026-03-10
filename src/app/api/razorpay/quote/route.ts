import { NextResponse } from 'next/server';
import {
  getBearerTokenFromRequest,
  verifySupabaseToken,
} from '../../../../../backend/supabaseJwtVerifier';
import { getActivationPricing } from '../../../../../backend/pricingTier';

/**
 * GET /api/razorpay/quote
 * Returns activation pricing for the current user (no side effects).
 */
export async function GET(request: Request) {
  try {
    const bearerToken = getBearerTokenFromRequest(request);
    if (!bearerToken) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const payload = await verifySupabaseToken(bearerToken);
    const userId = payload.sub;
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const { activationIndex, amountPaise, isFree } = await getActivationPricing();

    return NextResponse.json({
      isFree,
      amountPaise,
      activationNumber: activationIndex,
    });
  } catch (error) {
    console.error('Razorpay quote error:', error);
    return NextResponse.json(
      { error: 'Failed to get quote' },
      { status: 500 }
    );
  }
}
