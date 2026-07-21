import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../../backend/supabaseAdminClient';
import {
  getBearerTokenFromRequest,
  verifySupabaseToken,
} from '../../../../../backend/supabaseJwtVerifier';
import {
  renderCheckinStickerPng,
  renderEmergencyStickerHPng,
  renderEmergencyStickerVPng,
} from '@/lib/renderEmergencySticker';
import { stickerNameBase } from '@/lib/stickerFilename';
import { zipStore } from '@/lib/zipStore';

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
      .select(
        'id, owner_profile_id, vehicle_number, qr_token, checkin_token, vehicle_kind'
      )
      .eq('id', vehicleId)
      .single();

    if (error || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    if (vehicle.owner_profile_id !== userId) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }
    if (!vehicle.qr_token) {
      return NextResponse.json(
        { error: 'Generate the safety QR first.' },
        { status: 400 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    const companyName = profile?.full_name ?? null;
    const labels = {
      vehicleNumber: vehicle.vehicle_number,
      companyName,
    };
    const base = stickerNameBase(vehicle.vehicle_number, companyName);
    const origin = QR_BASE_URL.replace(/\/$/, '');
    const emergencyUrl = `${origin}/e/${vehicle.qr_token}`;
    const dual = vehicle.vehicle_kind !== 'two_wheeler';

    let checkinToken = vehicle.checkin_token as string | null;
    if (dual && !checkinToken) {
      checkinToken = `ci_${crypto.randomBytes(16).toString('hex')}`;
      const { error: ciErr } = await supabaseAdmin
        .from('fleet_vehicles')
        .update({ checkin_token: checkinToken })
        .eq('id', vehicle.id);
      if (ciErr) {
        console.error('Failed to auto-create checkin_token:', ciErr);
        checkinToken = null;
      }
    }

    const files: { name: string; data: Buffer }[] = [
      {
        name: `${base}-safety-rear.png`,
        data: await renderEmergencyStickerVPng(emergencyUrl, labels),
      },
    ];

    if (dual) {
      files.push({
        name: `${base}-safety-side.png`,
        data: await renderEmergencyStickerHPng(emergencyUrl, labels),
      });

      if (checkinToken) {
        const checkinUrl = `${origin}/vehicle-checkin/${checkinToken}`;
        files.push({
          name: `${base}-checkin.png`,
          data: await renderCheckinStickerPng(checkinUrl, labels),
        });
      }
    }

    const zip = zipStore(files);
    const zipName = `${base}.zip`;

    return new NextResponse(new Uint8Array(zip), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('download-vehicle-stickers error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to build zip' },
      { status: 500 }
    );
  }
}
