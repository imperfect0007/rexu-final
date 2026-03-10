import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../../backend/supabaseAdminClient';

function hashOtp(otp: string) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export async function POST(request: Request) {
  try {
    const { mobile } = await request.json();

    if (!mobile || typeof mobile !== 'string') {
      return NextResponse.json(
        { error: 'Valid mobile number is required' },
        { status: 400 }
      );
    }

    // Basic per-mobile rate limiting: max 5 active codes in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from('mobile_verification')
      .select('id', { count: 'exact', head: true })
      .eq('mobile', mobile)
      .gte('created_at', tenMinutesAgo);

    if (countError) {
      console.error('OTP count error:', countError);
    }

    if ((count ?? 0) >= 5) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please try again later.' },
        { status: 429 }
      );
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    const { error } = await supabaseAdmin.from('mobile_verification').insert({
      mobile,
      otp_hash: otpHash,
      expires_at: expiresAt,
    });

    if (error) {
      console.error('Failed to store OTP:', error);
      return NextResponse.json(
        { error: 'Failed to issue OTP' },
        { status: 500 }
      );
    }

    // NOTE: In production, send OTP via SMS provider (Twilio/msg91/etc.)
    // For this MVP, we log it on the server for debugging and do not return it to the client.
    console.log('[QRgency] OTP for', mobile, 'is', otp);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Request OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to request OTP' },
      { status: 500 }
    );
  }
}

