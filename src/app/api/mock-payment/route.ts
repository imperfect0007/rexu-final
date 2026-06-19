import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../backend/supabaseAdminClient';
import {
  getBearerTokenFromRequest,
  verifySupabaseToken,
} from '../../../../backend/supabaseJwtVerifier';

export async function POST(request: Request) {
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

    // 1. Update profiles table to set paid status
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ is_paid: true, activation_completed: true })
      .eq('id', userId);

    if (profileError) {
      console.error('MockPayment: profile update error:', profileError);
      return NextResponse.json({ error: 'Failed to update profile status' }, { status: 500 });
    }

    // 2. Call database complete_activation RPC to generate QR and setup logs
    const { data: activationRows, error: activationError } = await supabaseAdmin
      .rpc('complete_activation', {
        p_profile_id: userId,
      });

    if (activationError) {
      console.error('MockPayment: complete_activation rpc error:', activationError);
    }

    // 3. Fetch QR token from database
    const { data: qrCodes, error: qrError } = await supabaseAdmin
      .from('qr_codes')
      .select('token')
      .eq('profile_id', userId)
      .limit(1);

    if (qrError || !qrCodes || qrCodes.length === 0) {
      console.error('MockPayment: failed to retrieve QR code:', qrError);
      return NextResponse.json({ error: 'Payment completed but QR code generation failed' }, { status: 500 });
    }

    const qrToken = qrCodes[0].token;

    // 4. Log mock payment in payments table
    const idempotencyKey = `mock-payment-${userId}-${Date.now()}`;
    await supabaseAdmin.from('payments').insert({
      profile_id: userId,
      amount_paise: 34900,
      currency_code: 'INR',
      provider: 'mock_gateway',
      provider_payment_id: `pay_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`,
      status: 'succeeded',
      is_activation: true,
      idempotency_key: idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      token: qrToken,
    });
  } catch (err: any) {
    console.error('MockPayment error:', err);
    return NextResponse.json({ error: 'Mock payment failed' }, { status: 500 });
  }
}
