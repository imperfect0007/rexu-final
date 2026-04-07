import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { supabaseAdmin } from '../../../../../backend/supabaseAdminClient';
import {
  getBearerTokenFromRequest,
  verifySupabaseToken,
} from '../../../../../backend/supabaseJwtVerifier';

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
      .select('id, owner_profile_id, checkin_token')
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

    const checkinUrl = `${QR_BASE_URL.replace(/\/$/, '')}/vehicle-checkin/${vehicle.checkin_token}`;
    const qrDataUrl = await QRCode.toDataURL(checkinUrl, {
      margin: 1,
      width: 300,
      color: { dark: '#111827', light: '#FFFFFF' },
    });

    // Check-in / Check-out sticker card matching the provided layout.
    const cardSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#A3A3A3"/>
  <rect x="205" y="106" width="614" height="848" rx="42" fill="#F8FAFC"/>

  <text x="250" y="215" fill="#111827" font-family="Arial, Helvetica, sans-serif" font-size="74" font-weight="700">rexu</text>
  <text x="760" y="196" fill="#1F2937" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="500">@rexu.india</text>
  <text x="760" y="237" fill="#1F2937" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="500">support@rexu.in</text>
  <line x1="250" y1="255" x2="760" y2="255" stroke="#A3D27A" stroke-width="4"/>

  <rect x="350" y="270" width="324" height="324" rx="24" fill="#A3D27A"/>
  <rect x="340" y="260" width="324" height="324" rx="24" fill="#F8FAFC" stroke="#111827" stroke-width="7"/>
  <image x="352" y="272" width="300" height="300" href="${qrDataUrl}"/>

  <text x="512" y="652" text-anchor="middle" fill="#111827" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="800">Check In/Out</text>
  <text x="512" y="724" text-anchor="middle" fill="#374151" font-family="Arial, Helvetica, sans-serif" font-size="29" font-weight="500">Scan using phone camera, google lens</text>
  <text x="512" y="758" text-anchor="middle" fill="#374151" font-family="Arial, Helvetica, sans-serif" font-size="29" font-weight="500">or any QR Scanning app.</text>

  <rect x="205" y="802" width="614" height="82" fill="#A3D27A"/>
  <text x="512" y="844" text-anchor="middle" fill="#111827" font-family="Arial, Helvetica, sans-serif" font-size="37" font-weight="700">Please scan the QR code before</text>
  <text x="512" y="878" text-anchor="middle" fill="#111827" font-family="Arial, Helvetica, sans-serif" font-size="37" font-weight="700">starting a ride</text>
  <text x="512" y="918" text-anchor="middle" fill="#111827" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="500">Get yours now at www.rexu.in</text>
</svg>`;

    return new NextResponse(cardSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Content-Disposition': 'attachment; filename="rexu-checkin-card.svg"',
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
