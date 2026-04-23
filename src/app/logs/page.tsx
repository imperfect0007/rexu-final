'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Shield,
  Loader2,
  User,
  ArrowLeft,
  ScrollText,
  Truck,
  Filter,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface FleetVehicleSummary {
  vehicle_id: string;
  owner_profile_id: string;
  vehicle_number: string;
  label: string | null;
  make_model: string | null;
  last_log_at: string | null;
  logs_total: number;
  checkins_total: number;
  checkouts_total: number;
  logs_with_vec: number;
}

interface FleetVehicleLog {
  checkin_id: string;
  owner_profile_id: string;
  vehicle_id: string;
  driver_id: string | null;
  check_type: 'check_in' | 'check_out';
  created_at: string;
  trip_purpose: string | null;
  trip_note: string | null;
  has_vec: boolean;
  vec_doc_link: string | null;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function LogsPage() {
  const [loading, setLoading] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileName, setProfileName] = useState('rexu');
  const [vehicles, setVehicles] = useState<FleetVehicleSummary[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehicleLogs, setVehicleLogs] = useState<FleetVehicleLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [filterHasVec, setFilterHasVec] = useState<'all' | 'yes' | 'no'>('all');
  const router = useRouter();

  useEffect(() => {
    void init();
  }, []);

  const init = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('account_type, full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (profileErr) console.error('Logs: profile error:', profileErr);
      if (profileData?.full_name) setProfileName(profileData.full_name);
      if ((profileData?.account_type ?? 'personal') !== 'commercial') {
        router.push('/dashboard');
        return;
      }

      const { data, error } = await supabase
        .from('fleet_vehicle_logs_summary')
        .select('*')
        .eq('owner_profile_id', user.id)
        .order('last_log_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Logs: vehicles fetch error:', error);
        return;
      }

      const v = (data as FleetVehicleSummary[]) || [];
      setVehicles(v);
      if (v.length > 0) {
        setSelectedVehicleId(v[0].vehicle_id);
        void loadVehicleLogs(v[0].vehicle_id);
      }
    } catch (err) {
      console.error('Logs init error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVehicleLogs = async (vehicleId: string) => {
    setLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('fleet_checkin_logs')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) {
        console.error('Vehicle logs fetch error:', error);
        return;
      }
      setVehicleLogs((data as FleetVehicleLog[]) || []);
    } finally {
      setLogsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#9AC57A]" />
      </div>
    );
  }

  const selectedVehicle = vehicles.find((x) => x.vehicle_id === selectedVehicleId) || null;
  const filteredLogs =
    filterHasVec === 'all'
      ? vehicleLogs
      : filterHasVec === 'yes'
        ? vehicleLogs.filter((l) => l.has_vec)
        : vehicleLogs.filter((l) => !l.has_vec);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#101518] to-black text-white pb-20">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1] as [number, number, number, number] }}
        className="bg-[#1F2428] border-b border-[#2B3136] sticky top-0 z-10"
      >
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-9 h-9 rounded-full border border-[#3A3F45] flex items-center justify-center text-[#B7BEC4] hover:bg-[#2B3136] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="bg-[#145A3A] p-1.5 rounded-full">
              <ScrollText className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white leading-tight">Activity Logs</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#B7BEC4]">
                Fleet audit trail
              </span>
            </div>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((o) => !o)}
              className="h-8 px-2.5 rounded-lg bg-[#2B3136] border border-[#3A3F45] text-white text-[11px] font-bold tracking-wide flex items-center justify-center hover:bg-[#3A3F45] transition-colors"
            >
              {profileName || 'rexu'}
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-[#3A3F45] bg-[#1F2428] shadow-lg py-1 text-sm z-20">
                <button type="button" onClick={() => { setProfileMenuOpen(false); router.push('/dashboard'); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#B7BEC4] hover:bg-[#2B3136] hover:text-white">
                  <Shield className="w-4 h-4" /> Back to dashboard
                </button>
                <button type="button" onClick={() => { setProfileMenuOpen(false); router.push('/profile'); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#B7BEC4] hover:bg-[#2B3136] hover:text-white">
                  <User className="w-4 h-4" /> Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="max-w-5xl mx-auto px-4 py-8 space-y-6"
      >
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-white/10 rounded-[28px] bg-[#101518]/90 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#B7BEC4] mb-1">Vehicles</p>
              <p className="text-3xl font-bold text-white">{vehicles.length}</p>
            </div>
            <ScrollText className="w-6 h-6 text-[#B7BEC4]/40" />
          </div>
          <div className="border border-white/10 rounded-[28px] bg-[#101518]/90 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#B7BEC4] mb-1">Selected vehicle logs</p>
              <p className="text-3xl font-bold text-[#9AC57A]">
                {filteredLogs.length}
              </p>
            </div>
            <Filter className="w-6 h-6 text-[#9AC57A]/40" />
          </div>
        </div>

        {/* Filters */}
        <section className="bg-[#101518]/90 rounded-[28px] p-6 border border-white/10 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Vehicle logs</h2>
              <p className="text-sm text-[#B7BEC4] mt-0.5">
                Tap a vehicle to view check-in/out logs.
              </p>
            </div>
          </div>

          {/* Vehicle picker */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-[#0B0F12]/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#B7BEC4]" />
                <p className="text-sm font-semibold text-white">Vehicles</p>
              </div>
              <div className="max-h-[420px] overflow-auto divide-y divide-white/5">
                {vehicles.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-[#B7BEC4]/70">No vehicles yet.</p>
                ) : (
                  vehicles.map((v) => {
                    const active = v.vehicle_id === selectedVehicleId;
                    return (
                      <button
                        key={v.vehicle_id}
                        type="button"
                        onClick={() => {
                          setSelectedVehicleId(v.vehicle_id);
                          void loadVehicleLogs(v.vehicle_id);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-white/[0.03] transition ${
                          active ? 'bg-[#145A3A]/20' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {v.vehicle_number}
                              {v.label ? <span className="text-[#B7BEC4] font-normal"> • {v.label}</span> : null}
                            </p>
                            <p className="text-[11px] text-[#B7BEC4]/70">
                              {v.make_model || '—'}
                              {v.last_log_at ? ` • Last: ${new Date(v.last_log_at).toLocaleString('en-IN')}` : ''}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-bold text-white">{v.logs_total}</p>
                            <p className="text-[10px] text-[#B7BEC4]/70">logs</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-[#B7BEC4]/70">
                          <span className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.02]">
                            In: {v.checkins_total}
                          </span>
                          <span className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.02]">
                            Out: {v.checkouts_total}
                          </span>
                          <span className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.02]">
                            VEC: {v.logs_with_vec}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0B0F12]/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {selectedVehicle ? `Logs • ${selectedVehicle.vehicle_number}` : 'Logs'}
                  </p>
                  <p className="text-[11px] text-[#B7BEC4]/70">
                    {selectedVehicle?.make_model || 'Select a vehicle to view logs.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterHasVec('all')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                      filterHasVec === 'all'
                        ? 'bg-[#145A3A] border-[#145A3A] text-white'
                        : 'bg-[#2B3136] border-[#3A3F45] text-[#B7BEC4] hover:bg-[#3A3F45] hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterHasVec('yes')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                      filterHasVec === 'yes'
                        ? 'bg-[#145A3A] border-[#145A3A] text-white'
                        : 'bg-[#2B3136] border-[#3A3F45] text-[#B7BEC4] hover:bg-[#3A3F45] hover:text-white'
                    }`}
                  >
                    VEC ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterHasVec('no')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                      filterHasVec === 'no'
                        ? 'bg-[#145A3A] border-[#145A3A] text-white'
                        : 'bg-[#2B3136] border-[#3A3F45] text-[#B7BEC4] hover:bg-[#3A3F45] hover:text-white'
                    }`}
                  >
                    VEC ☐
                  </button>
                </div>
              </div>

              <div className="max-h-[420px] overflow-auto divide-y divide-white/5">
                {logsLoading ? (
                  <div className="px-4 py-6 flex items-center gap-2 text-sm text-[#B7BEC4]">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading logs…
                  </div>
                ) : selectedVehicleId == null ? (
                  <p className="px-4 py-4 text-sm text-[#B7BEC4]/70">Select a vehicle.</p>
                ) : filteredLogs.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-[#B7BEC4]/70">No logs for this vehicle.</p>
                ) : (
                  filteredLogs.map((l) => (
                    <div key={l.checkin_id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">
                            {l.check_type === 'check_in' ? 'Check In' : 'Check Out'}
                            <span className="ml-2 text-[10px] font-semibold px-2 py-1 rounded-full border border-white/10 bg-white/[0.02] text-[#B7BEC4]">
                              {formatTime(l.created_at)}
                            </span>
                          </p>
                          <p className="text-[11px] text-[#B7BEC4]/70">
                            {new Date(l.created_at).toLocaleDateString('en-IN')}
                            {l.trip_purpose ? ` • ${l.trip_purpose}` : ''}
                            {l.trip_note ? ` • ${l.trip_note}` : ''}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span
                            className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${
                              l.has_vec
                                ? 'text-[#9AC57A] bg-[#0F3D2E]/30 border-[#145A3A]/40'
                                : 'text-[#B7BEC4] bg-[#2B3136] border-[#3A3F45]'
                            }`}
                          >
                            VEC {l.has_vec ? '✓' : '☐'}
                          </span>
                          {l.vec_doc_link ? (
                            <a
                              href={l.vec_doc_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-[#9AC57A] hover:underline"
                            >
                              Open
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </section>
      </motion.main>
    </div>
  );
}
