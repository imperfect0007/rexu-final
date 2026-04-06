'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logFleetActivity } from '@/lib/fleetLogger';
import {
  Shield,
  Loader2,
  User,
  ArrowLeft,
  ClipboardCheck,
  Camera,
  X,
  Truck,
  LogIn,
  LogOut,
  Image as ImageIcon,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FleetCheckin {
  id: string;
  vehicle_id: string;
  driver_id: string | null;
  check_type: 'check_in' | 'check_out';
  odometer_reading: number | null;
  fuel_level: string | null;
  condition_notes: string | null;
  photo_paths: string[];
  created_at: string;
  fleet_vehicles: { vehicle_number: string } | null;
  fleet_drivers: { name: string } | null;
}

interface VehicleOption {
  id: string;
  vehicle_number: string;
}

interface DriverOption {
  id: string;
  name: string;
  assigned_vehicle_id: string | null;
}

const FUEL_LEVELS = ['Full', '3/4', '1/2', '1/4', 'Empty'];

export default function CheckinsPage() {
  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<FleetCheckin[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [expandedCheckin, setExpandedCheckin] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string[]>>({});

  const [checkType, setCheckType] = useState<'check_in' | 'check_out'>('check_in');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [odometer, setOdometer] = useState('');
  const [fuelLevel, setFuelLevel] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
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
        .select('account_type')
        .eq('id', user.id)
        .maybeSingle();

      if ((profileData?.account_type ?? 'personal') !== 'commercial') {
        router.push('/dashboard');
        return;
      }

      const [{ data: history }, { data: vehs }, { data: drvs }] = await Promise.all([
        supabase
          .from('fleet_checkins')
          .select('*, fleet_vehicles(vehicle_number), fleet_drivers(name)')
          .eq('owner_profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('fleet_vehicles')
          .select('id, vehicle_number')
          .eq('owner_profile_id', user.id)
          .order('vehicle_number'),
        supabase
          .from('fleet_drivers')
          .select('id, name, assigned_vehicle_id')
          .eq('owner_profile_id', user.id)
          .order('name'),
      ]);

      setCheckins((history as FleetCheckin[]) || []);
      setVehicles(vehs || []);
      setDrivers((drvs as DriverOption[]) || []);
    } catch (err) {
      console.error('Checkins: fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setPhotos((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const uploadedPaths: string[] = [];
      for (const photo of photos) {
        const ext = photo.name.split('.').pop() || 'jpg';
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('fleet-photos')
          .upload(path, photo);

        if (uploadErr) {
          console.error('Photo upload error:', uploadErr);
          continue;
        }
        uploadedPaths.push(path);
      }

      const { data: inserted, error: dbError } = await supabase
        .from('fleet_checkins')
        .insert({
          owner_profile_id: user.id,
          vehicle_id: selectedVehicle,
          driver_id: selectedDriver || null,
          check_type: checkType,
          odometer_reading: odometer ? parseFloat(odometer) : null,
          fuel_level: fuelLevel || null,
          condition_notes: conditionNotes.trim() || null,
          photo_paths: uploadedPaths,
        })
        .select('*, fleet_vehicles(vehicle_number), fleet_drivers(name)')
        .single();

      if (dbError) {
        setSubmitError(dbError.message);
        setSubmitting(false);
        return;
      }

      setCheckins((prev) => [inserted as FleetCheckin, ...prev]);

      const vehicleName = vehicles.find((v) => v.id === selectedVehicle)?.vehicle_number || selectedVehicle;
      const driverName = selectedDriver ? drivers.find((d) => d.id === selectedDriver)?.name : null;

      await logFleetActivity({
        action: checkType,
        entityType: 'checkin',
        entityId: inserted.id,
        description: `${checkType === 'check_in' ? 'Checked in' : 'Checked out'} vehicle ${vehicleName}${driverName ? ` (driver: ${driverName})` : ''}`,
        metadata: {
          vehicle_id: selectedVehicle,
          driver_id: selectedDriver || null,
          odometer: odometer || null,
          fuel_level: fuelLevel || null,
          photos_count: uploadedPaths.length,
        },
      });

      setSubmitSuccess(`${checkType === 'check_in' ? 'Check-in' : 'Check-out'} recorded for ${vehicleName}.`);

      setSelectedVehicle('');
      setSelectedDriver('');
      setOdometer('');
      setFuelLevel('');
      setConditionNotes('');
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
      setPhotos([]);
      setPhotoPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError('Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const loadPhotos = async (checkinId: string, paths: string[]) => {
    if (photoUrls[checkinId]) {
      setExpandedCheckin(expandedCheckin === checkinId ? null : checkinId);
      return;
    }

    const urls: string[] = [];
    for (const path of paths) {
      const { data } = await supabase.storage
        .from('fleet-photos')
        .createSignedUrl(path, 300);
      if (data?.signedUrl) urls.push(data.signedUrl);
    }

    setPhotoUrls((prev) => ({ ...prev, [checkinId]: urls }));
    setExpandedCheckin(checkinId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#9AC57A]" />
      </div>
    );
  }

  const todayCheckins = checkins.filter((c) => {
    const d = new Date(c.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

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
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white leading-tight">Check-in / Check-out</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#B7BEC4]">
                Vehicle shift tracking
              </span>
            </div>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((o) => !o)}
              className="h-8 px-2.5 rounded-lg bg-[#2B3136] border border-[#3A3F45] text-white text-[11px] font-bold tracking-wide flex items-center justify-center hover:bg-[#3A3F45] transition-colors"
            >
              rexu
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-white/10 rounded-[28px] bg-[#101518]/90 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#B7BEC4] mb-1">Today&apos;s Records</p>
              <p className="text-3xl font-bold text-white">{todayCheckins.length}</p>
            </div>
            <ClipboardCheck className="w-6 h-6 text-[#B7BEC4]/40" />
          </div>
          <div className="border border-white/10 rounded-[28px] bg-[#101518]/90 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#B7BEC4] mb-1">Check-ins Today</p>
              <p className="text-3xl font-bold text-[#9AC57A]">
                {todayCheckins.filter((c) => c.check_type === 'check_in').length}
              </p>
            </div>
            <LogIn className="w-6 h-6 text-[#9AC57A]/40" />
          </div>
          <div className="border border-white/10 rounded-[28px] bg-[#101518]/90 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#B7BEC4] mb-1">Check-outs Today</p>
              <p className="text-3xl font-bold text-amber-400">
                {todayCheckins.filter((c) => c.check_type === 'check_out').length}
              </p>
            </div>
            <LogOut className="w-6 h-6 text-amber-400/40" />
          </div>
        </div>

        {/* Check-in / Check-out Form */}
        <section className="bg-[#101518]/90 rounded-[28px] p-6 border border-white/10 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">Record Check-in / Check-out</h2>
            <p className="text-sm text-[#B7BEC4] mt-0.5">
              Log vehicle usage with photos and notes
            </p>
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-red-900/30 text-red-400 text-xs font-medium border border-red-800">
              {submitError}
            </div>
          )}
          {submitSuccess && (
            <div className="p-3 rounded-xl bg-green-900/30 text-[#9AC57A] text-xs font-medium border border-green-800">
              {submitSuccess}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Check type toggle */}
            <div className="flex rounded-xl overflow-hidden border border-[#3A3F45]">
              <button
                type="button"
                onClick={() => setCheckType('check_in')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  checkType === 'check_in'
                    ? 'bg-[#145A3A] text-white'
                    : 'bg-[#2B3136] text-[#B7BEC4] hover:bg-[#3A3F45]'
                }`}
              >
                <LogIn className="w-4 h-4" /> Check In
              </button>
              <button
                type="button"
                onClick={() => setCheckType('check_out')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  checkType === 'check_out'
                    ? 'bg-amber-600 text-white'
                    : 'bg-[#2B3136] text-[#B7BEC4] hover:bg-[#3A3F45]'
                }`}
              >
                <LogOut className="w-4 h-4" /> Check Out
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Vehicle</label>
                <select
                  required
                  value={selectedVehicle}
                  onChange={(e) => {
                    setSelectedVehicle(e.target.value);
                    const assignedDriver = drivers.find(
                      (d) => d.assigned_vehicle_id === e.target.value
                    );
                    if (assignedDriver) setSelectedDriver(assignedDriver.id);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                >
                  <option value="" disabled>Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.vehicle_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Driver</label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                >
                  <option value="">No driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Odometer (km)</label>
                <input
                  type="number"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                  placeholder="E.g. 45230"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Fuel Level</label>
                <select
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                >
                  <option value="">Select fuel level</option>
                  {FUEL_LEVELS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Condition Notes</label>
              <textarea
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                placeholder="E.g. Minor scratch on left bumper, all lights working"
              />
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Photos</label>
              <div className="flex flex-wrap gap-3">
                {photoPreviews.map((preview, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#3A3F45]">
                    <img src={preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-[#3A3F45] flex flex-col items-center justify-center gap-1 text-[#B7BEC4]/60 hover:text-[#B7BEC4] hover:border-[#B7BEC4]/40 transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-[9px] uppercase tracking-wider font-semibold">Add</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedVehicle}
              className={`w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-semibold active:scale-[0.98] transition disabled:opacity-50 ${
                checkType === 'check_in'
                  ? 'bg-[#145A3A] hover:bg-[#1F7A5A]'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Recording…
                </>
              ) : checkType === 'check_in' ? (
                <>
                  <LogIn className="w-4 h-4" /> Record Check-in
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" /> Record Check-out
                </>
              )}
            </button>
          </form>
        </section>

        {/* History */}
        <section className="bg-[#101518]/90 rounded-[28px] p-6 border border-white/10 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">Recent History</h2>
            <p className="text-sm text-[#B7BEC4] mt-0.5">Latest check-ins and check-outs</p>
          </div>

          {checkins.length > 0 ? (
            <div className="rounded-xl border border-white/5 divide-y divide-white/5">
              {checkins.map((c) => (
                <div key={c.id} className="hover:bg-white/[0.02] transition-colors">
                  <div className="px-4 py-4 flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        c.check_type === 'check_in'
                          ? 'bg-[#0F3D2E]/30 border border-[#145A3A]/40'
                          : 'bg-amber-950/30 border border-amber-500/30'
                      }`}
                    >
                      {c.check_type === 'check_in' ? (
                        <LogIn className="w-5 h-5 text-[#9AC57A]" />
                      ) : (
                        <LogOut className="w-5 h-5 text-amber-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-sm text-white">
                          {c.fleet_vehicles?.vehicle_number || 'Unknown'}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            c.check_type === 'check_in'
                              ? 'text-[#9AC57A] bg-[#0F3D2E]/30 border border-[#145A3A]/40'
                              : 'text-amber-400 bg-amber-950/30 border border-amber-500/30'
                          }`}
                        >
                          {c.check_type === 'check_in' ? 'Check In' : 'Check Out'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#B7BEC4]">
                        {c.fleet_drivers && <span>Driver: {c.fleet_drivers.name}</span>}
                        {c.odometer_reading && <span>Odo: {c.odometer_reading} km</span>}
                        {c.fuel_level && <span>Fuel: {c.fuel_level}</span>}
                        <span>
                          {new Date(c.created_at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {c.condition_notes && (
                        <p className="text-xs text-[#B7BEC4]/60 mt-1 line-clamp-1">
                          {c.condition_notes}
                        </p>
                      )}
                    </div>

                    {c.photo_paths.length > 0 && (
                      <button
                        type="button"
                        onClick={() => loadPhotos(c.id, c.photo_paths)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3A3F45] text-[11px] font-medium text-[#B7BEC4] hover:bg-[#2B3136] hover:text-white transition-colors shrink-0"
                      >
                        <ImageIcon className="w-3 h-3" />
                        {c.photo_paths.length} photo{c.photo_paths.length !== 1 ? 's' : ''}
                        <ChevronDown
                          className={`w-3 h-3 transition-transform ${expandedCheckin === c.id ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {expandedCheckin === c.id && photoUrls[c.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-4 pb-4"
                      >
                        <div className="flex flex-wrap gap-3">
                          {photoUrls[c.id].map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-24 h-24 rounded-xl overflow-hidden border border-[#3A3F45] hover:border-[#145A3A] transition-colors"
                            >
                              <img
                                src={url}
                                alt={`Checkin photo ${i + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#B7BEC4]/60 py-4 text-center">
              No check-in/check-out records yet.
            </p>
          )}
        </section>
      </motion.main>
    </div>
  );
}
