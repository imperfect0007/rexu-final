import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import {
  getBearerTokenFromRequest,
  verifySupabaseToken,
} from '../../../../../backend/supabaseJwtVerifier';
import { getActivationPricing } from '../../../../../backend/pricingTier';

const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

/**
 * POST /api/razorpay/create-order
 * Creates a Razorpay order for QR activation. Call this only when amountPaise > 0.
 */
export async function POST(request: Request) {
  try {
    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Payment system is not configured.' },
        { status: 503 }
      );
    }

    const bearerToken = getBearerTokenFromRequest(request);
    if (!bearerToken) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const payload = await verifySupabaseToken(bearerToken);
    const userId = payload.sub;
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { amountPaise } = body as { amountPaise?: number };

    const { activationIndex, amountPaise: expectedPaise } = await getActivationPricing();

    if (expectedPaise === 0) {
      return NextResponse.json(
        { error: 'Your activation is free. Use the free activation flow instead.' },
        { status: 400 }
      );
    }

    if (amountPaise !== expectedPaise) {
      return NextResponse.json(
        { error: `Amount mismatch. Expected ${expectedPaise} paise.` },
        { status: 400 }
      );
    }

    const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const receipt = `rexu-activation-${userId.slice(0, 8)}-${Date.now()}`.slice(0, 40);

    const order = await instance.orders.create({
      amount: expectedPaise,
      currency: 'INR',
      receipt,
      notes: {
        profile_id: userId,
        activation_index: String(activationIndex),
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (error) {
    console.error('Razorpay create-order error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
