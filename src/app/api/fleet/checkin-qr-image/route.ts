import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../backend/supabaseAdminClient';
import {
  getBearerTokenFromRequest,
  verifySupabaseToken,
} from '../../../../../backend/supabaseJwtVerifier';
import { renderCheckinStickerPng } from '@/lib/renderEmergencySticker';

const QR_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://rexu.in';

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

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    if (!vehicleId) {
      return NextResponse.json({ error: 'vehicleId is required' }, { status: 400 });
    }

    const { data: vehicle, error } = await supabaseAdmin
      .from('fleet_vehicles')
      .select('id, owner_profile_id, checkin_token, vehicle_number')
      .eq('id', vehicleId)
      .single();

    if (error || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    if (vehicle.owner_profile_id !== userId) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    if (!vehicle.checkin_token) {
      return NextResponse.json({ error: 'No check-in QR yet. Generate one first.' }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    const checkinUrl = `${QR_BASE_URL.replace(/\/$/, '')}/vehicle-checkin/${vehicle.checkin_token}`;
    const png = await renderCheckinStickerPng(checkinUrl, {
      vehicleNumber: vehicle.vehicle_number,
      companyName: profile?.full_name ?? null,
    });

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="rexu-checkin-card.png"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('checkin-qr-image error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate QR image' },
      { status: 500 }
    );
  }
}
