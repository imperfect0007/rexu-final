import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../../backend/supabaseAdminClient';
import {
  getBearerTokenFromRequest,
  verifySupabaseToken,
} from '../../../../../backend/supabaseJwtVerifier';
import { uploadQrPngToBucket } from '../../../../../backend/qrBucketUploader';

export async function POST(request: Request) {
  try {
    const bearerToken = getBearerTokenFromRequest(request);
    if (!bearerToken) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const payload = await verifySupabaseToken(bearerToken);
    const userId = payload.sub;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Invalid token subject' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { vehicleId } = body as { vehicleId?: string };

    if (!vehicleId) {
      return NextResponse.json({ error: 'vehicleId is required' }, { status: 400 });
    }

    // Ensure vehicle belongs to this profile
    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from('fleet_vehicles')
      .select('id, owner_profile_id, qr_token')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    if (vehicle.owner_profile_id !== userId) {
      return NextResponse.json({ error: 'Not allowed for this vehicle' }, { status: 403 });
    }

    // If QR already exists for this vehicle, just return it
    if (vehicle.qr_token) {
      return NextResponse.json({ token: vehicle.qr_token, alreadyExists: true });
    }

    // Create a new QR token and row in qr_codes tied to this profile
    const token = crypto.randomBytes(16).toString('hex');

    const { error: qrError } = await supabaseAdmin.from('qr_codes').insert({
      profile_id: userId,
      token,
      is_active: true,
    });

    if (qrError) {
      console.error('Failed to insert qr_codes row for vehicle:', qrError);
      const isOneQrPerProfileLimit =
        qrError.code === '23505' &&
        (qrError.message?.includes('uq_qr_codes_profile_id') ||
          qrError.details?.includes('profile_id'));
      return NextResponse.json(
        {
          error: isOneQrPerProfileLimit
            ? 'Database still limits one QR per account. Run scripts/migrations/20250605_allow_multiple_qr_codes_per_profile.sql in Supabase, then try again.'
            : 'Failed to create QR for vehicle',
        },
        { status: 500 }
      );
    }

    // Store token on the vehicle row for easy lookup in the dashboard
    const { error: updateError } = await supabaseAdmin
      .from('fleet_vehicles')
      .update({ qr_token: token })
      .eq('id', vehicleId);

    if (updateError) {
      console.error('Failed to update fleet_vehicles with qr_token:', updateError);
    }

    try {
      await uploadQrPngToBucket(token);
    } catch (err) {
      console.error('Failed to upload vehicle QR PNG to bucket:', err);
      // Non-fatal: token still exists and can be used to regenerate image later.
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error('generate-vehicle-qr error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate vehicle QR' },
      { status: 500 }
    );
  }
}

