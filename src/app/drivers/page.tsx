'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logFleetActivity } from '@/lib/fleetLogger';
import {
  Shield,
  Plus,
  Loader2,
  User,
  X,
  Trash2,
  ArrowLeft,
  Search,
  Phone,
  Droplets,
  Truck,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface FleetVehicle {
  id: string;
  owner_profile_id: string;
  vehicle_number: string;
}

interface FleetDriver {
  id: string;
  owner_profile_id: string;
  name: string;
  phone: string;
  blood_group: string | null;
  notes: string | null;
  assigned_vehicle_id: string | null;
}

export default function DriverManagerPage() {
  const [loading, setLoading] = useState(true);
  const [fleetDrivers, setFleetDrivers] = useState<FleetDriver[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverBloodGroup, setDriverBloodGroup] = useState('');
  const [driverNotes, setDriverNotes] = useState('');
  const [driverSaving, setDriverSaving] = useState(false);
  const [driverError, setDriverError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const router = useRouter();

  useEffect(() => {
    void fetchDriversAndVehicles();
  }, []);

  const fetchDriversAndVehicles = async () => {
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

      const [{ data: drivers, error: driverError }, { data: vehicles, error: vehicleError }] =
        await Promise.all([
          supabase
            .from('fleet_drivers')
            .select('id, owner_profile_id, name, phone, blood_group, notes, assigned_vehicle_id')
            .eq('owner_profile_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('fleet_vehicles')
            .select('id, owner_profile_id, vehicle_number')
            .eq('owner_profile_id', user.id)
            .order('created_at', { ascending: true }),
        ]);

      if (driverError) {
        console.error('DriverManager: error fetching drivers:', driverError);
      }
      if (vehicleError) {
        console.error('DriverManager: error fetching vehicles:', vehicleError);
      }

      setFleetDrivers(drivers || []);
      setFleetVehicles(vehicles || []);
    } catch (err) {
      console.error('DriverManager: fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setDriverError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      setDriverError('Profile not loaded. Please refresh the page.');
      return;
    }
    if (!driverName.trim() || !driverPhone.trim()) {
      setDriverError('Driver name and phone are required.');
      return;
    }

    setDriverSaving(true);
    try {
      const { data, error } = await supabase
        .from('fleet_drivers')
        .insert({
          owner_profile_id: user.id,
          name: driverName.trim(),
          phone: driverPhone.trim(),
          blood_group: driverBloodGroup.trim() || null,
          notes: driverNotes.trim() || null,
        })
        .select()
        .single();

      if (error) {
        console.error('DriverManager: failed to create driver:', error);
        setDriverError(error.message ?? 'Failed to save driver.');
        return;
      }

      setFleetDrivers((prev) => [data as FleetDriver, ...prev]);

      await logFleetActivity({
        action: 'driver_added',
        entityType: 'driver',
        entityId: data.id,
        description: `Added driver ${driverName.trim()} (${driverPhone.trim()})`,
        metadata: { name: driverName.trim(), phone: driverPhone.trim(), blood_group: driverBloodGroup.trim() || null },
      });

      setDriverName('');
      setDriverPhone('');
      setDriverBloodGroup('');
      setDriverNotes('');
      setIsDriverModalOpen(false);
    } catch (err) {
      console.error('DriverManager: create driver error:', err);
      setDriverError(err instanceof Error ? err.message : 'Something went wrong while saving.');
    } finally {
      setDriverSaving(false);
    }
  };

  const handleAssignDriver = async (driverId: string, vehicleId: string | null) => {
    try {
      const { data, error } = await supabase
        .from('fleet_drivers')
        .update({ assigned_vehicle_id: vehicleId })
        .eq('id', driverId)
        .select()
        .single();

      if (error) {
        console.error('DriverManager: failed to update driver assignment:', error);
        return;
      }

      setFleetDrivers((prev) =>
        prev.map((d) => (d.id === driverId ? (data as FleetDriver) : d))
      );
    } catch (err) {
      console.error('DriverManager: update driver assignment error:', err);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        'Are you sure you would like to delete this driver? This will remove their assignments as well.'
      );
      if (!ok) return;
    }

    try {
      const { error } = await supabase.from('fleet_drivers').delete().eq('id', driverId);
      if (error) {
        console.error('DriverManager: failed to delete driver:', error);
        return;
      }

      const deletedDriver = fleetDrivers.find((d) => d.id === driverId);
      setFleetDrivers((prev) => prev.filter((d) => d.id !== driverId));

      await logFleetActivity({
        action: 'driver_deleted',
        entityType: 'driver',
        entityId: driverId,
        description: `Deleted driver ${deletedDriver?.name || 'unknown'}`,
      });
    } catch (err) {
      console.error('DriverManager: delete driver error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#9AC57A]" />
      </div>
    );
  }

  const assignedCount = fleetDrivers.filter((d) => d.assigned_vehicle_id).length;

  const filteredDrivers = searchQuery.trim()
    ? fleetDrivers.filter((d) => {
        const q = searchQuery.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.phone.toLowerCase().includes(q) ||
          (d.blood_group && d.blood_group.toLowerCase().includes(q))
        );
      })
    : fleetDrivers;

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
                Driver Manager
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#B7BEC4]">
                Drivers
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
                Manage all your drivers, their contact information, and vehicle assignments from
                a single place.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-center justify-center px-5 py-3 rounded-xl border border-[#3A3F45] bg-[#2B3136] min-w-[72px]">
                <span className="text-2xl font-bold text-white">{fleetDrivers.length}</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#B7BEC4] font-semibold">Drivers</span>
              </div>
              <div className="flex flex-col items-center justify-center px-5 py-3 rounded-xl bg-[#0F3D2E]/30 border border-[#145A3A]/40 min-w-[72px]">
                <span className="text-2xl font-bold text-[#9AC57A]">{assignedCount}</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#9AC57A] font-semibold">Assigned</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Drivers section ── */}
        <section className="bg-[#101518]/90 rounded-[28px] p-6 border border-white/10 space-y-5">
          {/* Title row */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">
                Drivers
              </h2>
              <p className="text-sm text-[#B7BEC4] mt-0.5">
                Add, manage and assign drivers to vehicles
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDriverModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#145A3A] text-white text-sm font-semibold hover:bg-[#1F7A5A] active:scale-[0.97] transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Driver</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B7BEC4]/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, or blood group..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/50 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
            />
          </div>

          {/* Driver list */}
          {filteredDrivers.length > 0 ? (
            <div className="rounded-xl border border-white/5 divide-y divide-white/5">
              {filteredDrivers.map((driver) => {
                const assignedVehicle = fleetVehicles.find(
                  (v) => v.id === driver.assigned_vehicle_id
                );
                return (
                  <div
                    key={driver.id}
                    className="px-4 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#2B3136] border border-[#3A3F45] flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-[#B7BEC4]" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-white">
                          {driver.name}
                        </span>
                        {assignedVehicle && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9AC57A] bg-[#0F3D2E]/30 border border-[#145A3A]/40 rounded-full px-2 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#9AC57A]" />
                            Assigned
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#B7BEC4]">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {driver.phone}
                        </span>
                        {driver.blood_group && (
                          <span className="inline-flex items-center gap-1">
                            <Droplets className="w-3 h-3" /> {driver.blood_group}
                          </span>
                        )}
                        {assignedVehicle && (
                          <span className="inline-flex items-center gap-1">
                            <Truck className="w-3 h-3" /> {assignedVehicle.vehicle_number}
                          </span>
                        )}
                      </div>
                      {driver.notes && (
                        <p className="text-xs text-[#B7BEC4]/60 mt-1 line-clamp-1">{driver.notes}</p>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteDriver(driver.id)}
                      className="p-2 rounded-lg text-[#B7BEC4]/40 hover:text-red-400 hover:bg-red-950/30 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#B7BEC4]/60 py-4 text-center">
              {searchQuery.trim()
                ? 'No drivers match your search.'
                : 'No drivers added yet. Use "Add Driver" to register your first driver.'}
            </p>
          )}

          {/* Footer count */}
          {fleetDrivers.length > 0 && (
            <p className="text-xs text-[#B7BEC4]/50 pt-1">
              Showing {filteredDrivers.length} of {fleetDrivers.length} drivers
            </p>
          )}
        </section>
      </motion.main>

      {/* ── Add Driver Modal ── */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsDriverModalOpen(false)}
          />
          <div className="relative bg-[#1F2428] rounded-[28px] w-full max-w-md p-6 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Add Driver
                </h2>
                <p className="text-xs text-[#B7BEC4]">
                  Save driver details and optionally assign them to a vehicle later.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDriverModalOpen(false)}
                className="p-2 text-[#B7BEC4] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {driverError && (
              <div className="mb-3 text-xs text-red-400">{driverError}</div>
            )}

            <form onSubmit={handleCreateDriver} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">
                  Driver name
                </label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                  placeholder="E.g. Ramesh"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">
                  Phone
                </label>
                <input
                  type="tel"
                  required
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">
                  Blood group (optional)
                </label>
                <input
                  type="text"
                  value={driverBloodGroup}
                  onChange={(e) => setDriverBloodGroup(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm uppercase text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                  placeholder="O+"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                  placeholder="E.g. Night shift driver, speaks Kannada and Hindi"
                />
              </div>

              <button
                type="submit"
                disabled={driverSaving}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#145A3A] text-white text-sm font-semibold hover:bg-[#1F7A5A] active:scale-[0.98] transition disabled:opacity-50"
              >
                {driverSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving driver…</span>
                  </>
                ) : (
                  <span>Save Driver</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
