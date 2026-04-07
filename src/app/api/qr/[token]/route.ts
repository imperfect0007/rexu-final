import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../backend/supabaseAdminClient';
import QRCode from 'qrcode';

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
      .select('token, is_active')
      .eq('token', token)
      .maybeSingle();
    if (qrErr || !qrRow || qrRow.is_active === false) {
      console.error('QR token lookup error:', qrErr);
      return NextResponse.json({ error: 'QR not found' }, { status: 404 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://rexu.in';
    const emergencyUrl = `${baseUrl.replace(/\/$/, '')}/e/${token}`;

    const qrDataUrl = await QRCode.toDataURL(emergencyUrl, {
      margin: 1,
      width: 330,
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
    });

    const cardSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760">
  <rect width="1200" height="760" fill="#9CA3AF"/>
  <rect x="80" y="120" width="1040" height="520" rx="28" fill="#F8FAFC"/>
  <text x="130" y="205" fill="#0F172A" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700">rexu</text>
  <line x1="130" y1="225" x2="575" y2="225" stroke="#A3D27A" stroke-width="3"/>
  <text x="130" y="260" fill="#334155" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="700">
    Scan the code
  </text>
  <text x="130" y="310" fill="#334155" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="700">
    to contact
  </text>
  <text x="130" y="360" fill="#0F172A" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="800">
    in case of emergency.
  </text>
  <rect x="90" y="450" width="1020" height="90" fill="#A3D27A"/>
  <text x="145" y="505" fill="#0F172A" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700">
    Accidents? Wrong parking? please scan the QR code.
  </text>
  <text x="130" y="605" fill="#111827" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="500">
    Get yours now at www.rexu.in
  </text>
  <rect x="608" y="200" width="430" height="430" rx="26" fill="#FFFFFF" stroke="#A3D27A" stroke-width="14"/>
  <image x="658" y="250" width="330" height="330" href="${qrDataUrl}"/>
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
