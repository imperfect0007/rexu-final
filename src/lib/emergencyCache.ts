import { getRedis } from './redis';
import { supabaseAdmin } from '../../backend/supabaseAdminClient';

const CACHE_TTL_SECONDS = 60;
const CACHE_PREFIX = 'emergency:';

export interface CachedEmergencyData {
  profileId: string;
  fullName: string;
  mobile: string | null;
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

async function fetchFromSupabase(
  token: string
): Promise<CachedEmergencyData | null> {
  const { data: qrCode, error: qrError } = await supabaseAdmin
    .from('qr_codes')
    .select('profile_id')
    .eq('token', token)
    .eq('is_active', true)
    .single();

  if (!qrCode || qrError) return null;

  const [
    { data: profile },
    { data: emergencyProfile },
    { data: medicalInfo },
    { data: emergencyNote },
    { data: contacts },
    { data: fleetVehicle },
  ] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('full_name, is_paid, mobile')
      .eq('id', qrCode.profile_id)
      .single(),
    supabaseAdmin
      .from('emergency_profiles')
      .select(
        'blood_group, guardian_phone, secondary_contact_phone, emergency_instruction, language_note, age, organ_donor'
      )
      .eq('profile_id', qrCode.profile_id)
      .maybeSingle(),
    supabaseAdmin
      .from('medical_info')
      .select('allergies, medical_conditions, medications')
      .eq('profile_id', qrCode.profile_id)
      .maybeSingle(),
    supabaseAdmin
      .from('emergency_notes')
      .select('note')
      .eq('profile_id', qrCode.profile_id)
      .maybeSingle(),
    supabaseAdmin
      .from('emergency_contacts')
      .select('id, name, relation, phone')
      .eq('profile_id', qrCode.profile_id)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('fleet_vehicles')
      .select('id, vehicle_number, label, make_model')
      .eq('qr_token', token)
      .maybeSingle(),
  ]);

  if (!profile || !profile.is_paid) return null;

  return {
    profileId: qrCode.profile_id,
    fullName: profile.full_name,
    mobile: profile.mobile ?? null,
    bloodGroup: emergencyProfile?.blood_group ?? null,
    guardianPhone: emergencyProfile?.guardian_phone ?? null,
    secondaryContactPhone:
      emergencyProfile?.secondary_contact_phone ??
      (contacts?.[0]?.phone ?? null),
    emergencyInstruction: emergencyProfile?.emergency_instruction ?? null,
    languageNote: emergencyProfile?.language_note ?? null,
    age: emergencyProfile?.age ?? null,
    organDonor: emergencyProfile?.organ_donor ?? false,
    allergies: medicalInfo?.allergies ?? null,
    medicalConditions: medicalInfo?.medical_conditions ?? null,
    medications: medicalInfo?.medications ?? null,
    emergencyNote: emergencyNote?.note ?? null,
    contacts: contacts ?? [],
    fleetVehicle: fleetVehicle ?? null,
  };
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
      const cached = await redis.get<CachedEmergencyData>(key);
      if (cached) return cached;
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
