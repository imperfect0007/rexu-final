import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../../backend/supabaseAdminClient';
import {
  getBearerTokenFromRequest,
  verifySupabaseToken,
} from '../../../../../backend/supabaseJwtVerifier';
import { uploadQrPngToBucket } from '../../../../../backend/qrBucketUploader';
import { getActivationPricing } from '../../../../../backend/pricingTier';

const keySecret = process.env.RAZORPAY_KEY_SECRET;

function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const signatureBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

export async function POST(request: Request) {
  try {
    if (!keySecret) {
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
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = body as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { error: 'Missing payment verification fields' },
        { status: 400 }
      );
    }

    const isValid = verifyPaymentSignature(orderId, paymentId, signature, keySecret);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    const { data: activationRows, error: activationError } = await supabaseAdmin.rpc(
      'complete_activation',
      { p_profile_id: userId }
    );

    if (activationError || !activationRows || activationRows.length === 0) {
      console.error('complete_activation error:', activationError);
      return NextResponse.json(
        { error: 'Failed to complete activation' },
        { status: 500 }
      );
    }

    const { activation_number } = activationRows[0] as { activation_number: number; is_free: boolean };

    const { amountPaise } = await getActivationPricing();

    const idempotencyKey = `razorpay-${orderId}`;

    await supabaseAdmin.from('payments').upsert(
      {
        profile_id: userId,
        amount_paise: amountPaise,
        currency_code: 'INR',
        provider: 'razorpay',
        provider_payment_id: paymentId,
        status: 'succeeded',
        is_activation: true,
        idempotency_key: idempotencyKey,
      },
      { onConflict: 'idempotency_key' }
    );

    const { data: qrCodes } = await supabaseAdmin
      .from('qr_codes')
      .select('token')
      .eq('profile_id', userId)
      .limit(1);

    const qrToken = qrCodes?.[0]?.token ?? null;

    if (qrToken) {
      try {
        await uploadQrPngToBucket(qrToken);
      } catch (err) {
        console.error('Failed to upload QR PNG:', err);
      }
    }

    return NextResponse.json({
      success: true,
      activationNumber: activation_number,
      isFree: false,
      token: qrToken,
      pricePaise: amountPaise,
    });
  } catch (error) {
    console.error('Razorpay verify error:', error);
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    );
  }
}
