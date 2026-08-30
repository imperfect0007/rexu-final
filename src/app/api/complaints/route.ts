import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../../../backend/supabaseAdminClient';

function clean(value: string | undefined): string {
  return (value || '').replace(/[\r\n]+/g, '').trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const segment =
      body.segment === 'fleet' || body.segment === 'personal'
        ? body.segment
        : 'personal';

    if (!title || title.length < 3) {
      return NextResponse.json(
        { error: 'Title required (min 3 characters)' },
        { status: 400 }
      );
    }
    if (!text || text.length < 10) {
      return NextResponse.json(
        { error: 'Please describe the issue (min 10 characters)' },
        { status: 400 }
      );
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email is required' },
        { status: 400 }
      );
    }

    // Optional: attach logged-in user if present.
    let profileId: string | null = null;
    const authHeader = request.headers.get('authorization');
    const jwt = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;
    if (jwt) {
      const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
      const anon = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      if (url && anon) {
        const userClient = createClient(url, anon, {
          global: { headers: { Authorization: `Bearer ${jwt}` } },
        });
        const { data } = await userClient.auth.getUser();
        profileId = data.user?.id || null;
      }
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from('change_logs').insert({
      owner_profile_id: profileId,
      actor_profile_id: profileId,
      action: 'open',
      entity_type: 'ops_complaint',
      entity_id: id,
      new_data: {
        title,
        body: text,
        segment,
        source: 'customer',
        customer_name: name || null,
        created_by: profileId,
        created_by_email: email,
        created_at: now,
        resolved_by: null,
        resolved_by_email: null,
        resolved_at: null,
        resolution_note: null,
      },
    });

    if (error) {
      console.error('customer complaint insert failed:', error);
      return NextResponse.json(
        { error: 'Could not submit complaint. Try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('customer complaint error:', err);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
