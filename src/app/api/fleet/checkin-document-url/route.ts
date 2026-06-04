import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../backend/supabaseAdminClient';

const DOC_BUCKET = 'fleet-documents';

/**
 * Public check-in QR flow: issue a short-lived signed URL for a vehicle document.
 * Validates check-in token + document belongs to that vehicle (no auth session required).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const checkinToken = searchParams.get('token');
    const documentId = searchParams.get('documentId');

    if (!checkinToken || !documentId) {
      return NextResponse.json(
        { error: 'token and documentId are required' },
        { status: 400 }
      );
    }

    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from('fleet_vehicles')
      .select('id, owner_profile_id')
      .eq('checkin_token', checkinToken)
      .maybeSingle();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Invalid check-in token' }, { status: 404 });
    }

    const { data: doc, error: docError } = await supabaseAdmin
      .from('fleet_documents')
      .select('id, file_path, vehicle_id, owner_profile_id')
      .eq('id', documentId)
      .maybeSingle();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (
      doc.vehicle_id !== vehicle.id ||
      doc.owner_profile_id !== vehicle.owner_profile_id
    ) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from(DOC_BUCKET)
      .createSignedUrl(doc.file_path, 60 * 15);

    if (signError || !signed?.signedUrl) {
      console.error('checkin-document-url sign error:', signError);
      return NextResponse.json({ error: 'Failed to open document' }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (err) {
    console.error('checkin-document-url error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
