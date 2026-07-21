import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { Shield, AlertTriangle, HeartPulse, Pill, Activity, ArrowLeft, Ruler, Scale, Truck, User } from 'lucide-react';
import Link from 'next/link';
import { supabaseAdmin } from '../../../../backend/supabaseAdminClient';
import { EmergencyContactActions } from './EmergencyContactActions';
import { getEmergencyData } from '@/lib/emergencyCache';

export const revalidate = 60;

interface EmergencyPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function EmergencyPage({ params }: EmergencyPageProps) {
  const { token } = await params;

  if (!token || !/^[a-f0-9]{16,64}$/i.test(token)) {
    return notFound();
  }

  const data = await getEmergencyData(token);

  if (!data) {
    return notFound();
  }

  // Log scan asynchronously — fire-and-forget so it never blocks render
  logScan(token, data.profileId).catch(() => {});

  const safeContacts = data.contacts;
  const criticalNote = data.emergencyNote || data.emergencyInstruction || null;
  const allergies = data.allergies;
  const conditions = data.medicalConditions;
  const medications = data.medications;
  const bloodGroup = data.bloodGroup;
  const guardianPhone = data.guardianPhone;
  const secondaryPhone = data.secondaryContactPhone;
  const age = data.age;
  const languageNote = data.languageNote;
  const isOrganDonor = data.organDonor;
  const isFleetVehicle = !!data.fleetVehicle;
  const fleetVehicle = data.fleetVehicle;

  // Parse JSON from criticalNote if it is B2C extra info
  let parsedNote = criticalNote;
  let individualVehicle: {
    type: string;
    number: string;
    ownerName: string;
    imageUrl: string | null;
  } | null = null;
  let height: string | null = null;
  let weight: string | null = null;

  if (criticalNote) {
    try {
      const parsed = JSON.parse(criticalNote);
      if (parsed && parsed.isIndividualExtra) {
        individualVehicle = {
          type: parsed.vehicleType || '',
          number: parsed.vehicleNumber || '',
          ownerName: parsed.vehicleOwnerName || '',
          imageUrl: parsed.vehicleImageUrl || null,
        };
        height = parsed.height || null;
        weight = parsed.weight || null;
        parsedNote = parsed.emergencyInstruction || null;
      }
    } catch (e) {
      // Treat as normal text instruction
    }
  }

  // Generate signed URLs for profile photo and vehicle photo if they exist
  let avatarSignedUrl: string | null = null;
  let vehicleSignedUrl: string | null = null;

  if (data.avatarUrl) {
    try {
      const { data: signedData } = await supabaseAdmin.storage
        .from('profile-photos')
        .createSignedUrl(data.avatarUrl, 300);
      avatarSignedUrl = signedData?.signedUrl || null;
    } catch (err) {
      console.error('Error signing avatar URL:', err);
    }
  }

  if (individualVehicle?.imageUrl) {
    try {
      const { data: signedData } = await supabaseAdmin.storage
        .from('profile-photos')
        .createSignedUrl(individualVehicle.imageUrl, 300);
      vehicleSignedUrl = signedData?.signedUrl || null;
    } catch (err) {
      console.error('Error signing vehicle URL:', err);
    }
  }

  let driverName: string | null = null;
  let driverPhone: string | null = null;
  let driverBloodGroup: string | null = null;

  if (fleetVehicle?.id) {
    const { data: driverData } = await supabaseAdmin
      .from('fleet_drivers')
      .select('name, phone, blood_group')
      .eq('assigned_vehicle_id', fleetVehicle.id)
      .maybeSingle();

    if (driverData) {
      driverName = (driverData as any).name ?? null;
      driverPhone = (driverData as any).phone ?? null;
      driverBloodGroup = (driverData as any).blood_group ?? null;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#101518] to-black text-white flex flex-col">
      <header className="px-6 py-4 border-b border-[#2B3136] bg-[#1F2428]">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-full border border-[#3A3F45] flex items-center justify-center text-[#B7BEC4] hover:bg-[#2B3136] hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-full bg-[#145A3A] flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">REXU Emergency</h1>
            <p className="text-xs text-[#9AC57A] uppercase tracking-[0.2em]">
              ACT FAST · STAY CALM
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-stretch px-6 py-6 max-w-xl mx-auto w-full gap-4">
        {/* Identity & critical note */}
        <section className="space-y-3">
          <div className="bg-[#101518]/90 rounded-[28px] border border-white/10 px-5 py-5 space-y-3">
            <p className="text-sm text-[#9AC57A] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Emergency information for:</span>
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
              {avatarSignedUrl && (
                <img
                  src={avatarSignedUrl}
                  alt={data.fullName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#9AC57A] shadow-md shrink-0"
                />
              )}
              <div className="flex flex-col">
                <span className="leading-tight">
                  {isFleetVehicle && driverName
                    ? driverName
                    : isFleetVehicle
                    ? 'This vehicle & driver'
                    : data.fullName}
                </span>
                {!isFleetVehicle && age ? (
                  <span className="text-xs text-[#B7BEC4] font-normal mt-0.5">Age: {age} yrs</span>
                ) : null}
              </div>
            </h2>
            {languageNote && (
              <p className="text-xs text-[#B7BEC4]">
                Preferred language:{' '}
                <span className="font-medium text-white">{languageNote}</span>
              </p>
            )}

            {/* Blood group, height, weight & organ donor – inline badges */}
            {(bloodGroup || isOrganDonor || height || weight) && (
              <div className="space-y-3 pt-1">
                {bloodGroup && (
                  <div className="w-full px-5 py-4 rounded-2xl bg-red-600 text-white text-lg font-extrabold flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(248,113,113,0.5)]">
                    <Activity className="w-6 h-6 animate-pulse text-white" />
                    <span>Blood Group: {bloodGroup}</span>
                  </div>
                )}
                
                {(height || weight) && (
                  <div className="grid grid-cols-2 gap-3">
                    {height && (
                      <div className="px-4 py-3 rounded-xl border border-white/10 bg-[#1A2024]/80 flex items-center gap-3">
                        <Ruler className="w-5 h-5 text-[#9AC57A]" />
                        <div>
                          <p className="text-[10px] text-[#B7BEC4]/60 uppercase tracking-wider">Height</p>
                          <p className="text-sm font-bold text-white">{height} cm</p>
                        </div>
                      </div>
                    )}
                    {weight && (
                      <div className="px-4 py-3 rounded-xl border border-white/10 bg-[#1A2024]/80 flex items-center gap-3">
                        <Scale className="w-5 h-5 text-[#9AC57A]" />
                        <div>
                          <p className="text-[10px] text-[#B7BEC4]/60 uppercase tracking-wider">Weight</p>
                          <p className="text-sm font-bold text-white">{weight} kg</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isOrganDonor && (
                  <div className="w-full py-2.5 rounded-xl border border-[#9AC57A]/40 bg-[#0F3D2E]/30 text-[11px] text-[#9AC57A] font-semibold uppercase tracking-[0.18em] text-center">
                    Organ Donor
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Individual Vehicle details */}
          {!isFleetVehicle && individualVehicle && (
            <div className="rounded-[20px] border border-white/10 bg-[#101518]/90 px-5 py-4 space-y-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#9AC57A] font-semibold flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                Vehicle details
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1 space-y-1.5">
                  <p className="text-sm text-[#B7BEC4]">
                    <span className="font-semibold text-white">Owner Name:</span> {individualVehicle.ownerName || '—'}
                  </p>
                  <p className="text-sm text-[#B7BEC4]">
                    <span className="font-semibold text-white">Vehicle Number:</span>{' '}
                    <span className="font-mono text-white bg-white/15 px-2 py-0.5 rounded text-xs ml-1">
                      {individualVehicle.number || '—'}
                    </span>
                  </p>
                  <p className="text-sm text-[#B7BEC4]">
                    <span className="font-semibold text-white">Vehicle Type:</span> {individualVehicle.type || '—'}
                  </p>
                </div>
                {vehicleSignedUrl && (
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-white/10 shrink-0">
                    <img
                      src={vehicleSignedUrl}
                      alt="Vehicle"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {isFleetVehicle && (
            <>
              <div className="rounded-[20px] border border-white/10 bg-[#101518]/90 px-5 py-4 space-y-1">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#B7BEC4]/60">
                  Vehicle details
                </p>
                <p className="text-sm text-[#B7BEC4]">
                  <span className="font-semibold text-white">Company:</span> {data.fullName}
                </p>
                {data.mobile && (
                  <p className="text-sm text-[#B7BEC4]">
                    <span className="font-semibold text-white">Company mobile:</span>{' '}
                    <span className="font-mono">{data.mobile}</span>
                  </p>
                )}
                <p className="text-sm text-[#B7BEC4]">
                  <span className="font-semibold text-white">Vehicle number:</span>{' '}
                  {fleetVehicle?.vehicle_number ?? '—'}
                </p>
                {(fleetVehicle?.make_model || fleetVehicle?.label) && (
                  <p className="text-sm text-[#B7BEC4]">
                    <span className="font-semibold text-white">Vehicle name:</span>{' '}
                    {fleetVehicle?.make_model || fleetVehicle?.label}
                  </p>
                )}
              </div>

              {(driverName || driverPhone || driverBloodGroup) && (
                <div className="rounded-[20px] border border-white/10 bg-[#101518]/90 px-5 py-4 space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#B7BEC4]/60">
                    Driver details
                  </p>
                  {driverName && (
                    <p className="text-sm text-[#B7BEC4]">
                      <span className="font-semibold text-white">Driver:</span> {driverName}
                    </p>
                  )}
                  {driverPhone && (
                    <p className="text-sm text-[#B7BEC4]">
                      <span className="font-semibold text-white">Driver mobile:</span>{' '}
                      <span className="font-mono">{driverPhone}</span>
                    </p>
                  )}
                  {driverBloodGroup && (
                    <p className="text-sm text-[#B7BEC4]">
                      <span className="font-semibold text-white">Driver blood group:</span> {driverBloodGroup}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {parsedNote && (
            <div className="rounded-[20px] border border-red-500/40 bg-gradient-to-br from-red-950/80 via-[#101518] to-red-900/30 px-5 py-4 shadow-[0_0_40px_rgba(248,113,113,0.25)]">
              <p className="text-[11px] uppercase tracking-[0.25em] text-red-300 mb-1 flex items-center gap-2">
                <HeartPulse className="w-3 h-3" />
                Critical Emergency Instruction
              </p>
              <p className="text-sm leading-relaxed text-red-50">{parsedNote}</p>
            </div>
          )}
        </section>

        {/* Medical details & call actions */}
        <section className="space-y-4">
          {/* Allergies & conditions */}
          <div className="space-y-3">
            {allergies && (
              <div className="rounded-[20px] border border-red-600/50 bg-red-950/60 px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-red-300 mb-1 flex items-center gap-2">
                  <Pill className="w-3 h-3" />
                  Severe Allergies
                </p>
                <p className="text-sm text-red-50 leading-relaxed">{allergies}</p>
              </div>
            )}

            {(conditions || medications) && (
              <div className="rounded-[20px] border border-white/10 bg-[#101518]/90 px-5 py-4 space-y-3">
                {conditions && (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#B7BEC4]/60 mb-1">
                      Medical Conditions
                    </p>
                    <p className="text-sm text-[#B7BEC4] leading-relaxed">
                      {conditions}
                    </p>
                  </div>
                )}
                {medications && (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#B7BEC4]/60 mb-1">
                      Medications
                    </p>
                    <p className="text-sm text-[#B7BEC4] leading-relaxed">
                      {medications}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contact buttons with 5-minute masked virtual view */}
          <EmergencyContactActions
            guardianPhone={guardianPhone}
            secondaryPhone={secondaryPhone}
            contacts={safeContacts}
            primaryLabel={isFleetVehicle ? 'Call company' : undefined}
            primarySublabel={
              isFleetVehicle ? 'Company helpline' : undefined
            }
          />

          {/* Government helplines - fixed */}
          <div className="pt-3 border-t border-[#2B3136] space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <a
                href="tel:112"
                className="py-3 px-2 rounded-2xl bg-red-600 text-center text-[11px] font-semibold tracking-wide hover:bg-red-700 active:scale-[0.97] transition"
              >
                Ambulance
                <div className="text-xs font-mono mt-0.5">112</div>
              </a>
              <a
                href="tel:112"
                className="py-3 px-2 rounded-2xl bg-[#2B3136] border border-[#3A3F45] text-center text-[11px] font-semibold tracking-wide hover:bg-[#3A3F45] active:scale-[0.97] transition"
              >
                Police
                <div className="text-xs font-mono mt-0.5">112</div>
              </a>
              <a
                href="tel:112"
                className="py-3 px-2 rounded-2xl bg-[#2B3136] border border-[#3A3F45] text-center text-[11px] font-semibold tracking-wide hover:bg-[#3A3F45] active:scale-[0.97] transition"
              >
                Fire
                <div className="text-xs font-mono mt-0.5">112</div>
              </a>
            </div>
            <p className="text-[11px] text-[#B7BEC4]/50 text-center leading-relaxed">
              This page does not collect data from you. It only shows emergency information
              configured by the vehicle owner so you can help them quickly.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

async function logScan(token: string, profileId: string) {
  try {
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const userAgent = h.get('user-agent') || 'unknown';

    await supabaseAdmin.from('scan_logs').insert({
      token,
      profile_id: profileId,
      ip,
      user_agent: userAgent,
    });
  } catch {
    // non-critical — never block the emergency page
  }
}

