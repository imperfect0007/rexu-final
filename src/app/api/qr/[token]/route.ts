import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../backend/supabaseAdminClient';
import QRCode from 'qrcode';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || !/^[a-f0-9]{16,64}$/i.test(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  try {
    // Ensure token exists and is active before generating a sticker.
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
        .select('vehicle_number, label')
        .eq('qr_token', token)
        .maybeSingle(),
      supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', qrRow.profile_id)
        .maybeSingle(),
    ]);

    const vehicleNumber = vehicle?.vehicle_number?.trim() || '';
    const companyName = profile?.full_name?.trim() || '';

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://rexu.in';
    const emergencyUrl = `${baseUrl.replace(/\/$/, '')}/e/${token}`;

    // Original layout kept. Only QR size bumped slightly (330 → 360) inside same box.
    const boxX = 608;
    const boxY = 200;
    const boxSize = 430;
    const qrSize = 360;
    const qrX = boxX + Math.round((boxSize - qrSize) / 2);
    const qrY = boxY + Math.round((boxSize - qrSize) / 2);

    const qrDataUrl = await QRCode.toDataURL(emergencyUrl, {
      margin: 1,
      width: qrSize,
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
    });

    // Extra strip below the sticker for cut line + vehicle/company (for pasting/labeling).
    const canvasH = 880;
    const cutY = 670;
    const labelParts = [
      vehicleNumber ? `Vehicle: ${vehicleNumber}` : null,
      companyName ? `Company: ${companyName}` : null,
    ].filter(Boolean) as string[];
    const labelLine = labelParts.join('   ·   ') || 'Vehicle / Company';

    const cardSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${canvasH}" viewBox="0 0 1200 ${canvasH}">
  <rect width="1200" height="${canvasH}" fill="#9CA3AF"/>
  <rect x="80" y="120" width="1040" height="520" rx="28" fill="#F8FAFC"/>

  <text x="130" y="205" fill="#0F172A" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700">rexu</text>
  <line x1="130" y1="225" x2="575" y2="225" stroke="#A3D27A" stroke-width="3"/>

  <text x="130" y="272" fill="#334155" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="600">Scan the code</text>
  <text x="130" y="314" fill="#334155" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="600">to contact</text>
  <text x="130" y="370" fill="#0F172A" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="800">in case of emergency.</text>

  <rect x="90" y="450" width="1020" height="86" fill="#A3D27A"/>
  <text x="130" y="503" fill="#0F172A" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700">
    Accidents? Wrong parking? Please scan the QR code.
  </text>

  <text x="130" y="604" fill="#111827" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="500">
    Get yours now at www.rexu.in
  </text>

  <rect x="${boxX}" y="${boxY}" width="${boxSize}" height="${boxSize}" rx="26" fill="#FFFFFF" stroke="#A3D27A" stroke-width="14"/>
  <image x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" href="${qrDataUrl}"/>

  <!-- Cuttable strip: cut along dashed line; keep vehicle/company below when pasting -->
  <line x1="100" y1="${cutY}" x2="1100" y2="${cutY}" stroke="#475569" stroke-width="2" stroke-dasharray="10 8"/>
  <text x="600" y="${cutY - 12}" text-anchor="middle" fill="#64748B" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="600">✂ cut here</text>
  <text x="600" y="${cutY + 48}" text-anchor="middle" fill="#0F172A" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700">${escapeXml(labelLine)}</text>
</svg>`;

    return new NextResponse(cardSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Content-Disposition': 'attachment; filename="rexu-emergency-card.svg"',
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
