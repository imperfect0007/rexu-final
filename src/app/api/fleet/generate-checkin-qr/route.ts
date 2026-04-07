import { NextResponse } from 'next/server';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { supabaseAdmin } from '../../../../../backend/supabaseAdminClient';
import {
  getBearerTokenFromRequest,
  verifySupabaseToken,
} from '../../../../../backend/supabaseJwtVerifier';

const QR_BUCKET_NAME = process.env.SUPABASE_QR_BUCKET || 'QR';
const QR_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://rexu.in';

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

    const body = await request.json().catch(() => ({}));
    const { vehicleId, regenerate } = body as { vehicleId?: string; regenerate?: boolean };

    if (!vehicleId) {
      return NextResponse.json({ error: 'vehicleId is required' }, { status: 400 });
    }

    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from('fleet_vehicles')
      .select('id, owner_profile_id, checkin_token')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    if (vehicle.owner_profile_id !== userId) {
      return NextResponse.json({ error: 'Not allowed for this vehicle' }, { status: 403 });
    }

    if (vehicle.checkin_token && !regenerate) {
      return NextResponse.json({ token: vehicle.checkin_token, alreadyExists: true });
    }

    const token = `ci_${crypto.randomBytes(16).toString('hex')}`;

    const { error: updateError } = await supabaseAdmin
      .from('fleet_vehicles')
      .update({ checkin_token: token })
      .eq('id', vehicleId);

    if (updateError) {
      console.error('Failed to store checkin_token:', updateError);
      return NextResponse.json({ error: 'Failed to create check-in QR' }, { status: 500 });
    }

    const checkinUrl = `${QR_BASE_URL.replace(/\/$/, '')}/vehicle-checkin/${token}`;
    const pngBuffer = await QRCode.toBuffer(checkinUrl, {
      type: 'png',
      width: 512,
      margin: 2,
    });

    const { error: uploadError } = await supabaseAdmin.storage
      .from(QR_BUCKET_NAME)
      .upload(`checkin_${token}.png`, pngBuffer, {
        contentType: 'image/png',
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      console.error('Failed to upload check-in QR PNG:', uploadError);
    }

    return NextResponse.json({ token, regenerated: !!regenerate });
  } catch (error) {
    console.error('generate-checkin-qr error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate check-in QR' },
      { status: 500 }
    );
  }
}
