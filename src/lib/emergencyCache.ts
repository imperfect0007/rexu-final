import { getRedis } from './redis';
import { supabaseAdmin } from '../../backend/supabaseAdminClient';

const CACHE_TTL_SECONDS = 60;
const CACHE_PREFIX = 'emergency:';

export interface CachedEmergencyData {
  profileId: string;
  fullName: string;
  mobile: string | null;
  avatarUrl: string | null;
  bloodGroup: string | null;
  guardianPhone: string | null;
  secondaryContactPhone: string | null;
  emergencyInstruction: string | null;
  languageNote: string | null;
  age: number | null;
  organDonor: boolean;
  allergies: string | null;
  medicalConditions: string | null;
  medications: string | null;
  emergencyNote: string | null;
  contacts: { id: string; name: string; relation: string; phone: string }[];
  fleetVehicle: {
    id: string;
    vehicle_number: string;
    label: string | null;
    make_model: string | null;
  } | null;
}

function isCachedEmergencyData(value: unknown): value is CachedEmergencyData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.profileId === 'string' && Array.isArray(v.contacts);
}

async function fetchFromSupabase(
  token: string
): Promise<CachedEmergencyData | null> {
  try {
    const [{ data: qrCode }, { data: fleetByToken }] = await Promise.all([
      supabaseAdmin
        .from('qr_codes')
        .select('profile_id, is_active')
        .eq('token', token)
        .maybeSingle(),
      supabaseAdmin
        .from('fleet_vehicles')
        .select('id, vehicle_number, label, make_model, owner_profile_id')
        .eq('qr_token', token)
        .maybeSingle(),
    ]);

    // Prefer active qr_codes row; fall back to fleet vehicle owner for safety stickers.
    const profileId =
      (qrCode?.is_active !== false ? qrCode?.profile_id : null) ??
      fleetByToken?.owner_profile_id ??
      null;

    if (!profileId) return null;

    // Inactive personal QR with no fleet vehicle → treat as missing.
    if (qrCode && qrCode.is_active === false && !fleetByToken) return null;

    const [
      { data: profile },
      { data: emergencyProfile },
      { data: medicalInfo },
      { data: emergencyNote },
      { data: contacts },
    ] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('full_name, is_paid, mobile, avatar_url, account_type')
        .eq('id', profileId)
        .maybeSingle(),
      supabaseAdmin
        .from('emergency_profiles')
        .select(
          'blood_group, guardian_phone, secondary_contact_phone, emergency_instruction, language_note, age, organ_donor'
        )
        .eq('profile_id', profileId)
        .maybeSingle(),
      supabaseAdmin
        .from('medical_info')
        .select('allergies, medical_conditions, medications')
        .eq('profile_id', profileId)
        .maybeSingle(),
      supabaseAdmin
        .from('emergency_notes')
        .select('note')
        .eq('profile_id', profileId)
        .maybeSingle(),
      supabaseAdmin
        .from('emergency_contacts')
        .select('id, name, relation, phone')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: true }),
    ]);

    if (!profile) return null;

    const fleetVehicle = fleetByToken
      ? {
          id: fleetByToken.id,
          vehicle_number: fleetByToken.vehicle_number,
          label: fleetByToken.label,
          make_model: fleetByToken.make_model,
        }
      : null;

    // Personal unpaid QR with no fleet vehicle → inactive.
    // Commercial / fleet safety QRs work without B2C is_paid.
    const isCommercial = profile.account_type === 'commercial';
    if (!profile.is_paid && !fleetVehicle && !isCommercial) return null;

    const companyPhone = profile.mobile ?? null;

    return {
      profileId,
      fullName: profile.full_name ?? 'Emergency contact',
      mobile: companyPhone,
      avatarUrl: profile.avatar_url ?? null,
      bloodGroup: emergencyProfile?.blood_group ?? null,
      guardianPhone: fleetVehicle
        ? companyPhone
        : (emergencyProfile?.guardian_phone ?? null),
      secondaryContactPhone: fleetVehicle
        ? null
        : (emergencyProfile?.secondary_contact_phone ??
          (contacts?.[0]?.phone ?? null)),
      emergencyInstruction: emergencyProfile?.emergency_instruction ?? null,
      languageNote: emergencyProfile?.language_note ?? null,
      age: emergencyProfile?.age ?? null,
      organDonor: emergencyProfile?.organ_donor ?? false,
      allergies: medicalInfo?.allergies ?? null,
      medicalConditions: medicalInfo?.medical_conditions ?? null,
      medications: medicalInfo?.medications ?? null,
      emergencyNote: emergencyNote?.note ?? null,
      contacts: fleetVehicle ? [] : (contacts ?? []),
      fleetVehicle,
    };
  } catch (err) {
    console.error('fetchFromSupabase failed:', err);
    return null;
  }
}

/**
 * Returns emergency data for a QR token, served from Redis when available.
 * Falls back to Supabase if Redis is not configured or cache misses.
 */
export async function getEmergencyData(
  token: string
): Promise<CachedEmergencyData | null> {
  const redis = getRedis();
  const key = `${CACHE_PREFIX}${token}`;

  if (redis) {
    try {
      const cached = await redis.get(key);
      if (isCachedEmergencyData(cached)) return cached;
    } catch (err) {
      console.error('Redis read failed, falling back to Supabase:', err);
    }
  }

  const data = await fetchFromSupabase(token);

  if (data && redis) {
    try {
      await redis.set(key, data, { ex: CACHE_TTL_SECONDS });
    } catch (err) {
      console.error('Redis write failed:', err);
    }
  }

  return data;
}

/**
 * Bust the cache for a given token (call after profile updates).
 */
export async function invalidateEmergencyCache(token: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(`${CACHE_PREFIX}${token}`);
  } catch (err) {
    console.error('Redis invalidation failed:', err);
  }
}
