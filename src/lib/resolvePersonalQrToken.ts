import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Pick the account's primary (personal) emergency QR token, not a fleet vehicle token.
 */
export async function resolvePersonalQrToken(
  supabase: SupabaseClient,
  profileId: string
): Promise<string | null> {
  const [{ data: qrRows, error: qrError }, { data: fleetRows, error: fleetError }] =
    await Promise.all([
      supabase
        .from('qr_codes')
        .select('token, created_at')
        .eq('profile_id', profileId)
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      supabase
        .from('fleet_vehicles')
        .select('qr_token')
        .eq('owner_profile_id', profileId)
        .not('qr_token', 'is', null),
    ]);

  if (qrError) {
    console.error('resolvePersonalQrToken: qr_codes error:', qrError);
    return null;
  }
  if (fleetError) {
    console.error('resolvePersonalQrToken: fleet_vehicles error:', fleetError);
  }

  const rows = qrRows || [];
  if (rows.length === 0) return null;

  const fleetTokens = new Set(
    (fleetRows || []).map((v) => v.qr_token).filter((t): t is string => !!t)
  );

  const personal = rows.find((q) => !fleetTokens.has(q.token));
  return personal?.token ?? rows[0]?.token ?? null;
}
