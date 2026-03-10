import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '../../../../../backend/supabaseAdminClient';
import { verifyAdminToken } from '../../../../../backend/adminAuth';
import { invalidateEmergencyCache } from '@/lib/emergencyCache';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const adminAuth = cookieStore.get('admin_auth');

    if (!adminAuth || !verifyAdminToken(adminAuth.value)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profileId, active } = await request.json().catch(() => ({} as any));

    if (!profileId || typeof active !== 'boolean') {
      return NextResponse.json(
        { error: 'profileId and active flag are required' },
        { status: 400 }
      );
    }

    const { data: qrRows } = await supabaseAdmin
      .from('qr_codes')
      .select('token')
      .eq('profile_id', profileId);

    const { error } = await supabaseAdmin
      .from('qr_codes')
      .update({ is_active: active })
      .eq('profile_id', profileId);

    if (error) {
      console.error('Failed to update QR status:', error);
      return NextResponse.json(
        { error: 'Failed to update QR status' },
        { status: 500 }
      );
    }

    if (qrRows) {
      await Promise.all(qrRows.map((qr) => invalidateEmergencyCache(qr.token)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin QR status error:', error);
    return NextResponse.json(
      { error: 'Failed to update QR status' },
      { status: 500 }
    );
  }
}

