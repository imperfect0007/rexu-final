import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../backend/supabaseAdminClient';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || !/^[a-f0-9]{16,64}$/i.test(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(process.env.SUPABASE_QR_BUCKET || 'QR')
      .download(`${token}.png`);

    if (error || !data) {
      console.error('QR download error from storage:', error);
      return NextResponse.json({ error: 'QR not found' }, { status: 404 });
    }

    const buffer = Buffer.from(await data.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="rexu-qr.png"',
        'Cache-Control': 'public, max-age=31536000, immutable',
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
