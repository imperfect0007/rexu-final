import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../backend/supabaseAdminClient';
import {
  getBearerTokenFromRequest,
  verifySupabaseToken,
} from '../../../../backend/supabaseJwtVerifier';
import { uploadQrPngToBucket } from '../../../../backend/qrBucketUploader';
import { getActivationPricing } from '../../../../backend/pricingTier';

export async function POST(request: Request) {
  try {
    const bearerToken = getBearerTokenFromRequest(request);

    if (!bearerToken) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const payload = await verifySupabaseToken(bearerToken);
    const userId = payload.sub;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Invalid token subject' }, { status: 400 });
    }

    const pricing = await getActivationPricing();
    if (!pricing.isFree) {
      return NextResponse.json(
        { error: 'Payment required. Please complete payment through the checkout flow.' },
        { status: 402 }
      );
    }

    const { data: activationRows, error: activationError } = await supabaseAdmin
      .rpc('complete_activation', {
        p_profile_id: userId,
      });

    if (activationError || !activationRows || activationRows.length === 0) {
      console.error('complete_activation error:', activationError);
      return NextResponse.json({ error: 'Failed to complete activation' }, { status: 500 });
    }

    const { activation_number, is_free } = activationRows[0] as {
      activation_number: number;
      is_free: boolean;
    };

    // Fetch the QR token to return it to the client.
    // We intentionally avoid `.single()` here because there may be
    // historical duplicate rows for a profile. Instead, we select
    // and take the first result.
    const { data: qrCodes, error: qrError } = await supabaseAdmin
      .from('qr_codes')
      .select('token')
      .eq('profile_id', userId)
      .limit(1);

    if (qrError || !qrCodes || qrCodes.length === 0) {
      console.error('Failed to fetch QR code after activation:', qrError);
      return NextResponse.json({ error: 'Activation completed but QR code is missing' }, { status: 500 });
    }

    const qrCode = qrCodes[0];

    // Ensure QR image is stored in Supabase Storage `QR` bucket as {token}.png
    try {
      await uploadQrPngToBucket(qrCode.token);
    } catch (err) {
      console.error('Failed to upload QR PNG to QR bucket:', err);
      // Non-fatal: activation should still succeed even if image upload fails.
    }

    const idempotencyKey = `activation-${userId}`;

    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .upsert(
        {
          profile_id: userId,
          amount_paise: 0,
          currency_code: 'INR',
          provider: 'mock',
          provider_payment_id: crypto.randomUUID(),
          status: 'succeeded',
          is_activation: true,
          idempotency_key: idempotencyKey,
        },
        { onConflict: 'idempotency_key' }
      );

    if (paymentError) {
      console.error('Failed to record activation payment:', paymentError);
      // Do not fail activation for payment logging issues
    }

    return NextResponse.json({
      success: true,
      activationNumber: activation_number,
      isFree: true,
      token: qrCode.token,
      pricePaise: 0,
    });
  } catch (error) {
    console.error('Activation error:', error);
    return NextResponse.json({ error: 'Failed to activate QR' }, { status: 500 });
  }
}

