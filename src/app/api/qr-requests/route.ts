import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../../backend/supabaseAdminClient';

const REASONS = new Set(['lost', 'damaged', 'never_received', 'other']);

function clean(value: string | undefined): string {
  return (value || '').replace(/[\r\n]+/g, '').trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const reason =
      typeof body.reason === 'string' && REASONS.has(body.reason)
        ? body.reason
        : null;
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    const segment =
      body.segment === 'fleet' || body.segment === 'personal'
        ? body.segment
        : 'personal';
    const vehicleNumber =
      typeof body.vehicle_number === 'string'
        ? body.vehicle_number.trim().toUpperCase()
        : '';
    const vehicleId =
      typeof body.vehicle_id === 'string' ? body.vehicle_id.trim() : '';
    const qrToken =
      typeof body.qr_token === 'string' ? body.qr_token.trim() : '';

    if (!reason) {
      return NextResponse.json(
        { error: 'Select a reason for the re-request' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const jwt = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;
    if (!jwt) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const anon = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    if (!url || !anon) {
      return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
    }

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const profileId = authData.user.id;
    const email = (authData.user.email || '').toLowerCase();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, mobile')
      .eq('id', profileId)
      .maybeSingle();

    // Block duplicate open / in-progress requests for same personal QR or vehicle.
    const { data: openRows } = await supabaseAdmin
      .from('change_logs')
      .select('entity_id, new_data')
      .eq('entity_type', 'ops_qr_request')
      .in('action', ['open', 'in_progress'])
      .eq('owner_profile_id', profileId)
      .limit(50);

    const clash = (openRows || []).find((r) => {
      const d = (r.new_data || {}) as Record<string, unknown>;
      if (vehicleId) return d.vehicle_id === vehicleId;
      return !d.vehicle_id;
    });
    if (clash) {
      return NextResponse.json(
        {
          error: vehicleId
            ? 'This vehicle already has an open QR re-request.'
            : 'You already have an open QR re-request. Ops will process it soon.',
        },
        { status: 409 }
      );
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from('change_logs').insert({
      owner_profile_id: profileId,
      actor_profile_id: profileId,
      action: 'open',
      entity_type: 'ops_qr_request',
      entity_id: id,
      new_data: {
        reason,
        note: note || null,
        segment,
        source: 'customer',
        vehicle_id: vehicleId || null,
        vehicle_number: vehicleNumber || null,
        qr_token: qrToken || null,
        customer_name: profile?.full_name || null,
        customer_phone: profile?.mobile || null,
        created_by: profileId,
        created_by_email: email || null,
        created_at: now,
        fulfilled_by: null,
        fulfilled_by_email: null,
        fulfilled_at: null,
        fulfillment_note: null,
      },
    });

    if (error) {
      console.error('qr-request insert failed:', error);
      return NextResponse.json(
        { error: 'Could not submit request. Try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('qr-request error:', err);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
