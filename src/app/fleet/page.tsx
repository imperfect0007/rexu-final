'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logFleetActivity } from '@/lib/fleetLogger';
import {
  Shield,
  Plus,
  QrCode,
  Download,
  Loader2,
  User,
  X,
  Trash2,
  ArrowLeft,
  Search,
  Truck,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface FleetVehicle {
  id: string;
  owner_profile_id: string;
  vehicle_number: string;
  label: string | null;
  make_model: string | null;
  qr_token?: string | null;
  created_at: string;
}

export default function FleetManagerPage() {
  const [loading, setLoading] = useState(true);
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleLabel, setVehicleLabel] = useState('');
  const [vehicleMakeModel, setVehicleMakeModel] = useState('');
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const router = useRouter();

  useEffect(() => {
    void fetchFleet();
  }, []);

  const fetchFleet = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, account_type')
        .eq('id', user.id)
        .maybeSingle();

      const accountType = profileData?.account_type ?? user.user_metadata?.account_type ?? 'personal';

      setProfileName(
        profileData?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? 'Fleet owner'
      );

      if (accountType !== 'commercial') {
        router.push('/dashboard');
        return;
      }

      const { data, error } = await supabase
        .from('fleet_vehicles')
        .select(
          'id, owner_profile_id, vehicle_number, label, make_model, qr_token, created_at'
        )
        .eq('owner_profile_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('FleetManager: error fetching vehicles:', error);
      }

      setFleetVehicles(data || []);
    } catch (err) {
      console.error('FleetManager: fetchFleet error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setVehicleError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      setVehicleError('Profile not loaded. Please refresh the page.');
      return;
    }
    if (!vehicleNumber.trim()) {
      setVehicleError('Vehicle number is required.');
      return;
    }

    setVehicleSaving(true);
    try {
      const { data, error } = await supabase
        .from('fleet_vehicles')
        .insert({
          owner_profile_id: user.id,
          vehicle_number: vehicleNumber.trim(),
          label: vehicleLabel.trim() || null,
          make_model: vehicleMakeModel.trim() || null,
        })
        .select()
        .single();

      if (error) {
        console.error('FleetManager: failed to create fleet vehicle:', error);
        setVehicleError(error.message ?? 'Failed to save vehicle.');
        return;
      }

      setFleetVehicles((prev) => [data as FleetVehicle, ...prev]);

      await logFleetActivity({
        action: 'vehicle_added',
        entityType: 'vehicle',
        entityId: data.id,
        description: `Added vehicle ${vehicleNumber.trim()}`,
        metadata: { vehicle_number: vehicleNumber.trim(), label: vehicleLabel.trim() || null },
      });

      setVehicleNumber('');
      setVehicleLabel('');
      setVehicleMakeModel('');
      setIsVehicleModalOpen(false);
    } catch (err) {
      console.error('FleetManager: create vehicle error:', err);
      setVehicleError(
        err instanceof Error ? err.message : 'Something went wrong while saving vehicle.'
      );
    } finally {
      setVehicleSaving(false);
    }
  };

  const handleGenerateVehicleQr = async (vehicleId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        console.error('FleetManager: generateVehicleQr: no active session');
        return;
      }

      const res = await fetch('/api/fleet/generate-vehicle-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ vehicleId }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('FleetManager: failed to generate vehicle QR:', data.error);
        return;
      }
      if (!data.token) return;

      setFleetVehicles((prev) =>
        prev.map((v) => (v.id === vehicleId ? { ...v, qr_token: data.token } : v))
      );
    } catch (err) {
      console.error('FleetManager: generateVehicleQr client error:', err);
    }
  };

  const handleDownloadVehicleQr = async (token: string) => {
    try {
      const res = await fetch(`/api/qr/${token}`);
      if (!res.ok) {
        console.error('FleetManager: vehicle QR download API error', await res.text());
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rexu-vehicle-qr.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('FleetManager: failed to download vehicle QR:', err);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        'Are you sure you would like to delete this vehicle? This will also remove its QR from your fleet list.'
      );
      if (!ok) return;
    }

    try {
      const { error } = await supabase.from('fleet_vehicles').delete().eq('id', vehicleId);
      if (error) {
        console.error('FleetManager: failed to delete fleet vehicle:', error);
        return;
      }

      const deletedVehicle = fleetVehicles.find((v) => v.id === vehicleId);
      setFleetVehicles((prev) => prev.filter((v) => v.id !== vehicleId));

      await logFleetActivity({
        action: 'vehicle_deleted',
        entityType: 'vehicle',
        entityId: vehicleId,
        description: `Deleted vehicle ${deletedVehicle?.vehicle_number || 'unknown'}`,
      });
    } catch (err) {
      console.error('FleetManager: delete vehicle error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#9AC57A]" />
      </div>
    );
  }

  const qrReadyCount = fleetVehicles.filter((v) => v.qr_token).length;

  const filteredVehicles = searchQuery.trim()
    ? fleetVehicles.filter((v) => {
        const q = searchQuery.toLowerCase();
        return (
          v.vehicle_number.toLowerCase().includes(q) ||
          (v.label && v.label.toLowerCase().includes(q)) ||
          (v.make_model && v.make_model.toLowerCase().includes(q))
        );
      })
    : fleetVehicles;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#101518] to-black text-white pb-20">
      {/* ── Header ── */}
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
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white leading-tight">
                Vehicle Manager
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#B7BEC4]">
                Vehicles
              </span>
            </div>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((open) => !open)}
              className="h-8 px-2.5 rounded-lg bg-[#2B3136] border border-[#3A3F45] text-white text-[11px] font-bold tracking-wide flex items-center justify-center hover:bg-[#3A3F45] transition-colors"
            >
              rexu
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-[#3A3F45] bg-[#1F2428] shadow-lg py-1 text-sm z-20">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    router.push('/dashboard');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#B7BEC4] hover:bg-[#2B3136] hover:text-white"
                >
                  <Shield className="w-4 h-4" />
                  <span>Back to dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    router.push('/profile');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#B7BEC4] hover:bg-[#2B3136] hover:text-white"
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
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
        {/* ── Welcome card with stats ── */}
        <section className="bg-[#101518]/90 rounded-[28px] p-8 border border-white/10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Welcome, {profileName}
              </h1>
              <p className="text-[#B7BEC4] text-sm max-w-lg leading-relaxed">
                Manage all your fleet vehicles, generate QR codes, and download stickers from a
                single place.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-center justify-center px-5 py-3 rounded-xl border border-[#3A3F45] bg-[#2B3136] min-w-[72px]">
                <span className="text-2xl font-bold text-white">{fleetVehicles.length}</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#B7BEC4] font-semibold">Vehicles</span>
              </div>
              <div className="flex flex-col items-center justify-center px-5 py-3 rounded-xl bg-[#0F3D2E]/30 border border-[#145A3A]/40 min-w-[72px]">
                <span className="text-2xl font-bold text-[#9AC57A]">{qrReadyCount}</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#9AC57A] font-semibold">QR Ready</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Vehicles section ── */}
        <section className="bg-[#101518]/90 rounded-[28px] p-6 border border-white/10 space-y-5">
          {/* Title row */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">
                Fleet Vehicles
              </h2>
              <p className="text-sm text-[#B7BEC4] mt-0.5">
                Add, manage and download QR codes
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsVehicleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#145A3A] text-white text-sm font-semibold hover:bg-[#1F7A5A] active:scale-[0.97] transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vehicle</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B7BEC4]/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by number, label, or make & model..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/50 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
            />
          </div>

          {/* Vehicle list */}
          {filteredVehicles.length > 0 ? (
            <div className="rounded-xl border border-white/5 divide-y divide-white/5">
              {filteredVehicles.map((v) => (
                <div
                  key={v.id}
                  className="px-4 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[#2B3136] border border-[#3A3F45] flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5 text-[#B7BEC4]" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-white">
                        {v.vehicle_number}
                      </span>
                      {v.qr_token ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9AC57A] bg-[#0F3D2E]/30 border border-[#145A3A]/40 rounded-full px-2 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#9AC57A]" />
                          QR Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#B7BEC4]/60 bg-[#2B3136] border border-[#3A3F45] rounded-full px-2 py-0.5">
                          No QR
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#B7BEC4]">
                      {v.label && (
                        <span className="inline-flex items-center gap-1">
                          {v.label}
                        </span>
                      )}
                      {v.make_model && (
                        <span className="inline-flex items-center gap-1 text-[#B7BEC4]/60">
                          {v.make_model}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {v.qr_token ? (
                      <button
                        type="button"
                        onClick={() => v.qr_token && handleDownloadVehicleQr(v.qr_token)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#145A3A] text-white text-[11px] font-medium hover:bg-[#1F7A5A] transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleGenerateVehicleQr(v.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3A3F45] text-[11px] font-medium text-[#B7BEC4] hover:bg-[#2B3136] hover:text-white transition-colors"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>Generate QR</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteVehicle(v.id)}
                      className="p-2 rounded-lg text-[#B7BEC4]/40 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#B7BEC4]/60 py-4 text-center">
              {searchQuery.trim()
                ? 'No vehicles match your search.'
                : 'No vehicles added yet. Use "Add Vehicle" to register your first vehicle.'}
            </p>
          )}

          {/* Footer count */}
          {fleetVehicles.length > 0 && (
            <p className="text-xs text-[#B7BEC4]/50 pt-1">
              Showing {filteredVehicles.length} of {fleetVehicles.length} vehicles
            </p>
          )}
        </section>
      </motion.main>

      {/* ── Add Vehicle Modal ── */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsVehicleModalOpen(false)}
          />
          <div className="relative bg-[#1F2428] rounded-[28px] w-full max-w-md p-6 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Add Vehicle
                </h2>
                <p className="text-xs text-[#B7BEC4]">
                  Save your vehicle details first, then generate its QR.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(false)}
                className="p-2 text-[#B7BEC4] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {vehicleError && (
              <div className="mb-3 text-xs text-red-400">{vehicleError}</div>
            )}

            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  required
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                  placeholder="KA01AB1234"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={vehicleLabel}
                  onChange={(e) => setVehicleLabel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                  placeholder="E.g. Cab #21, Delivery Bike 3"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">
                  Make &amp; Model (optional)
                </label>
                <input
                  type="text"
                  value={vehicleMakeModel}
                  onChange={(e) => setVehicleMakeModel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                  placeholder="E.g. Tata Ace, Honda Activa"
                />
              </div>

              <button
                type="submit"
                disabled={vehicleSaving}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#145A3A] text-white text-sm font-semibold hover:bg-[#1F7A5A] active:scale-[0.98] transition disabled:opacity-50"
              >
                {vehicleSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving vehicle…</span>
                  </>
                ) : (
                  <span>Save Vehicle</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
