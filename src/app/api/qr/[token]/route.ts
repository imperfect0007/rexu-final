import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../backend/supabaseAdminClient';
import { renderEmergencyStickerPng } from '@/lib/renderEmergencySticker';
import { stickerNameBase } from '@/lib/stickerFilename';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || !/^[a-f0-9]{16,64}$/i.test(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const styleParam = (searchParams.get('style') || 'v').toLowerCase();
    const style: 'v' | 'h' = styleParam === 'h' ? 'h' : 'v';

    const { data: qrRow, error: qrErr } = await supabaseAdmin
      .from('qr_codes')
      .select('token, is_active, profile_id')
      .eq('token', token)
      .maybeSingle();
    if (qrErr || !qrRow || qrRow.is_active === false) {
      console.error('QR token lookup error:', qrErr);
      return NextResponse.json({ error: 'QR not found' }, { status: 404 });
    }

    const [{ data: vehicle }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from('fleet_vehicles')
        .select('vehicle_number')
        .eq('qr_token', token)
        .maybeSingle(),
      supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', qrRow.profile_id)
        .maybeSingle(),
    ]);

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://rexu.in';
    const emergencyUrl = `${baseUrl.replace(/\/$/, '')}/e/${token}`;

    const vehicleNumber = vehicle?.vehicle_number ?? null;
    const companyName = profile?.full_name ?? null;

    const png = await renderEmergencyStickerPng(
      emergencyUrl,
      { vehicleNumber, companyName },
      style
    );

    const base = stickerNameBase(vehicleNumber, companyName);
    const filename =
      style === 'h' ? `${base}-safety-side.png` : `${base}-safety-rear.png`;

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('QR download route error:', err);
    return NextResponse.json(
      { error: 'Failed to download QR' },
      { status: 500 }
    );
  }
}
