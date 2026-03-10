import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { Shield, AlertTriangle, HeartPulse, Pill, Activity, ArrowLeft } from 'lucide-react';
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
            <h2 className="text-2xl font-extrabold tracking-tight">
              {isFleetVehicle && driverName
                ? driverName
                : isFleetVehicle
                ? 'This vehicle & driver'
                : data.fullName}
              {!isFleetVehicle && age ? (
                <span className="text-base text-[#B7BEC4] ml-2">({age} yrs)</span>
              ) : null}
            </h2>
            {languageNote && (
              <p className="text-xs text-[#B7BEC4]">
                Preferred language:{' '}
                <span className="font-medium text-white">{languageNote}</span>
              </p>
            )}

            {/* Blood group & organ donor – inline badges */}
            {(bloodGroup || isOrganDonor) && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {bloodGroup && (
                  <div className="w-full px-5 py-4 rounded-2xl bg-red-600 text-white text-lg font-extrabold flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(248,113,113,0.5)]">
                    <Activity className="w-6 h-6" />
                    <span>Blood Group: {bloodGroup}</span>
                  </div>
                )}
                {isOrganDonor && (
                  <div className="px-3 py-1.5 rounded-full border border-[#9AC57A]/40 bg-[#0F3D2E]/30 text-[11px] text-[#9AC57A] font-semibold uppercase tracking-[0.18em]">
                    Organ Donor
                  </div>
                )}
              </div>
            )}
          </div>

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

              {data.mobile && (
                <a
                  href={`tel:${data.mobile}`}
                  className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-2xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-[0.98] transition"
                >
                  Call owner
                </a>
              )}

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

          {criticalNote && (
            <div className="rounded-[20px] border border-red-500/40 bg-gradient-to-br from-red-950/80 via-[#101518] to-red-900/30 px-5 py-4 shadow-[0_0_40px_rgba(248,113,113,0.25)]">
              <p className="text-[11px] uppercase tracking-[0.25em] text-red-300 mb-1 flex items-center gap-2">
                <HeartPulse className="w-3 h-3" />
                Critical Emergency Instruction
              </p>
              <p className="text-sm leading-relaxed text-red-50">{criticalNote}</p>
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

