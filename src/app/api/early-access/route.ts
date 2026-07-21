import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../backend/supabaseAdminClient';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const mobile =
      typeof body.mobile === 'string' && body.mobile.trim()
        ? body.mobile.trim()
        : null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }
    if (!full_name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('early_access_requests').insert({
      email,
      full_name,
      mobile,
      segment: 'personal',
    });

    if (error) {
      // ponytail: duplicate email is fine — treat as success
      if (error.code === '23505') {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      console.error('early-access insert error:', error);
      return NextResponse.json({ error: 'Failed to save request' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('early-access error:', err);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
