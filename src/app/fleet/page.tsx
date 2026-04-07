'use client';

import { useEffect, useState, useRef } from 'react';
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
  ChevronDown,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Camera,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FleetVehicle {
  id: string;
  owner_profile_id: string;
  vehicle_number: string;
  label: string | null;
  make_model: string | null;
  qr_token?: string | null;
  created_at: string;
}

interface MaintenanceReminder {
  id: string;
  vehicle_id: string;
  title: string;
  due_date: string;
  status: 'pending' | 'completed';
  completed_at: string | null;
  created_at: string;
}

interface FleetIncident {
  id: string;
  vehicle_id: string;
  incident_type: string;
  description: string;
  image_path: string | null;
  created_at: string;
}

const INCIDENT_TYPES = [
  { value: 'unauthorized_use', label: 'Unauthorized Use' },
  { value: 'damage', label: 'Damage' },
  { value: 'missing_checkin', label: 'Missing Check-In' },
  { value: 'other', label: 'Other' },
];

function getReminderStatus(dueDate: string, status: string): { label: string; color: string } {
  if (status === 'completed') return { label: 'Completed', color: 'text-[#9AC57A] bg-[#0F3D2E]/30 border-[#145A3A]/40' };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: 'text-red-400 bg-red-950/30 border-red-500/30' };
  if (diffDays <= 7) return { label: `${diffDays}d left`, color: 'text-amber-400 bg-amber-950/30 border-amber-500/30' };
  return { label: `${diffDays}d left`, color: 'text-[#B7BEC4] bg-[#2B3136] border-[#3A3F45]' };
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

  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Record<string, MaintenanceReminder[]>>({});
  const [incidents, setIncidents] = useState<Record<string, FleetIncident[]>>({});
  const [vehicleDetailLoading, setVehicleDetailLoading] = useState<string | null>(null);

  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderVehicleId, setReminderVehicleId] = useState<string | null>(null);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDueDate, setReminderDueDate] = useState('');
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);

  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [incidentVehicleId, setIncidentVehicleId] = useState<string | null>(null);
  const [incidentType, setIncidentType] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentImage, setIncidentImage] = useState<File | null>(null);
  const [incidentImagePreview, setIncidentImagePreview] = useState<string | null>(null);
  const [incidentSaving, setIncidentSaving] = useState(false);
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const incidentFileRef = useRef<HTMLInputElement>(null);

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

  const toggleVehicleDetails = async (vehicleId: string) => {
    if (expandedVehicle === vehicleId) {
      setExpandedVehicle(null);
      return;
    }
    setExpandedVehicle(vehicleId);

    if (reminders[vehicleId] && incidents[vehicleId]) return;

    setVehicleDetailLoading(vehicleId);
    try {
      const [{ data: rems }, { data: incs }] = await Promise.all([
        supabase
          .from('fleet_maintenance_reminders')
          .select('*')
          .eq('vehicle_id', vehicleId)
          .order('due_date', { ascending: true }),
        supabase
          .from('fleet_incidents')
          .select('*')
          .eq('vehicle_id', vehicleId)
          .order('created_at', { ascending: false }),
      ]);
      setReminders((prev) => ({ ...prev, [vehicleId]: (rems as MaintenanceReminder[]) || [] }));
      setIncidents((prev) => ({ ...prev, [vehicleId]: (incs as FleetIncident[]) || [] }));
    } catch (err) {
      console.error('FleetManager: fetch details error:', err);
    } finally {
      setVehicleDetailLoading(null);
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
      if (expandedVehicle === vehicleId) setExpandedVehicle(null);

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

  /* ── Maintenance Reminders ── */

  const openReminderModal = (vehicleId: string) => {
    setReminderVehicleId(vehicleId);
    setReminderTitle('');
    setReminderDueDate('');
    setReminderError(null);
    setIsReminderModalOpen(true);
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderVehicleId) return;
    setReminderError(null);
    setReminderSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('fleet_maintenance_reminders')
        .insert({
          owner_profile_id: user.id,
          vehicle_id: reminderVehicleId,
          title: reminderTitle.trim(),
          due_date: reminderDueDate,
        })
        .select()
        .single();

      if (error) {
        setReminderError(error.message);
        return;
      }

      setReminders((prev) => ({
        ...prev,
        [reminderVehicleId]: [...(prev[reminderVehicleId] || []), data as MaintenanceReminder].sort(
          (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        ),
      }));

      const vehicleName = fleetVehicles.find((v) => v.id === reminderVehicleId)?.vehicle_number || '';
      await logFleetActivity({
        action: 'reminder_created',
        entityType: 'reminder',
        entityId: data.id,
        description: `Created maintenance reminder "${reminderTitle.trim()}" for ${vehicleName}, due ${reminderDueDate}`,
        metadata: { vehicle_id: reminderVehicleId, due_date: reminderDueDate },
      });

      setIsReminderModalOpen(false);
    } catch (err) {
      console.error('Reminder create error:', err);
      setReminderError('Something went wrong.');
    } finally {
      setReminderSaving(false);
    }
  };

  const handleCompleteReminder = async (vehicleId: string, reminderId: string) => {
    try {
      const { error } = await supabase
        .from('fleet_maintenance_reminders')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', reminderId);

      if (error) {
        console.error('Complete reminder error:', error);
        return;
      }

      setReminders((prev) => ({
        ...prev,
        [vehicleId]: (prev[vehicleId] || []).map((r) =>
          r.id === reminderId ? { ...r, status: 'completed', completed_at: new Date().toISOString() } : r
        ),
      }));

      const reminder = reminders[vehicleId]?.find((r) => r.id === reminderId);
      const vehicleName = fleetVehicles.find((v) => v.id === vehicleId)?.vehicle_number || '';
      await logFleetActivity({
        action: 'reminder_completed',
        entityType: 'reminder',
        entityId: reminderId,
        description: `Completed maintenance reminder "${reminder?.title || ''}" for ${vehicleName}`,
      });
    } catch (err) {
      console.error('Complete reminder error:', err);
    }
  };

  /* ── Incidents ── */

  const openIncidentModal = (vehicleId: string) => {
    setIncidentVehicleId(vehicleId);
    setIncidentType('');
    setIncidentDescription('');
    setIncidentImage(null);
    setIncidentImagePreview(null);
    setIncidentError(null);
    setIsIncidentModalOpen(true);
  };

  const handleIncidentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIncidentImage(file);
    setIncidentImagePreview(URL.createObjectURL(file));
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentVehicleId || !incidentType) return;
    setIncidentError(null);
    setIncidentSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let imagePath: string | null = null;
      if (incidentImage) {
        const ext = incidentImage.name.split('.').pop() || 'jpg';
        const path = `${user.id}/incident_${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('fleet-photos')
          .upload(path, incidentImage);
        if (!uploadErr) imagePath = path;
      }

      const { data, error } = await supabase
        .from('fleet_incidents')
        .insert({
          owner_profile_id: user.id,
          vehicle_id: incidentVehicleId,
          incident_type: incidentType,
          description: incidentDescription.trim(),
          image_path: imagePath,
        })
        .select()
        .single();

      if (error) {
        setIncidentError(error.message);
        return;
      }

      setIncidents((prev) => ({
        ...prev,
        [incidentVehicleId]: [data as FleetIncident, ...(prev[incidentVehicleId] || [])],
      }));

      const vehicleName = fleetVehicles.find((v) => v.id === incidentVehicleId)?.vehicle_number || '';
      const typeLabel = INCIDENT_TYPES.find((t) => t.value === incidentType)?.label || incidentType;
      await logFleetActivity({
        action: 'incident_reported',
        entityType: 'incident',
        entityId: data.id,
        description: `Reported ${typeLabel} incident for ${vehicleName}`,
        metadata: { vehicle_id: incidentVehicleId, type: incidentType, has_image: !!imagePath },
      });

      if (incidentImagePreview) URL.revokeObjectURL(incidentImagePreview);
      setIsIncidentModalOpen(false);
    } catch (err) {
      console.error('Incident create error:', err);
      setIncidentError('Something went wrong.');
    } finally {
      setIncidentSaving(false);
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
                  onClick={() => { setProfileMenuOpen(false); router.push('/dashboard'); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#B7BEC4] hover:bg-[#2B3136] hover:text-white"
                >
                  <Shield className="w-4 h-4" /> Back to dashboard
                </button>
                <button
                  type="button"
                  onClick={() => { setProfileMenuOpen(false); router.push('/profile'); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#B7BEC4] hover:bg-[#2B3136] hover:text-white"
                >
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Fleet Vehicles</h2>
              <p className="text-sm text-[#B7BEC4] mt-0.5">Add, manage and download QR codes</p>
            </div>
            <button
              type="button"
              onClick={() => setIsVehicleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#145A3A] text-white text-sm font-semibold hover:bg-[#1F7A5A] active:scale-[0.97] transition"
            >
              <Plus className="w-4 h-4" /> Add Vehicle
            </button>
          </div>

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

          {filteredVehicles.length > 0 ? (
            <div className="rounded-xl border border-white/5 divide-y divide-white/5">
              {filteredVehicles.map((v) => {
                const isExpanded = expandedVehicle === v.id;
                const vReminders = reminders[v.id] || [];
                const vIncidents = incidents[v.id] || [];
                const pendingReminders = vReminders.filter((r) => r.status === 'pending');
                const overdueCount = pendingReminders.filter((r) => {
                  const now = new Date(); now.setHours(0, 0, 0, 0);
                  return new Date(r.due_date) < now;
                }).length;

                return (
                  <div key={v.id}>
                    <div className="px-4 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                      <div className="w-10 h-10 rounded-full bg-[#2B3136] border border-[#3A3F45] flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5 text-[#B7BEC4]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-sm text-white">{v.vehicle_number}</span>
                          {v.qr_token ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9AC57A] bg-[#0F3D2E]/30 border border-[#145A3A]/40 rounded-full px-2 py-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#9AC57A]" /> QR Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#B7BEC4]/60 bg-[#2B3136] border border-[#3A3F45] rounded-full px-2 py-0.5">
                              No QR
                            </span>
                          )}
                          {overdueCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-950/30 border border-red-500/30 rounded-full px-2 py-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> {overdueCount} overdue
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#B7BEC4]">
                          {v.label && <span>{v.label}</span>}
                          {v.make_model && <span className="text-[#B7BEC4]/60">{v.make_model}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {v.qr_token ? (
                          <button type="button" onClick={() => v.qr_token && handleDownloadVehicleQr(v.qr_token)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#145A3A] text-white text-[11px] font-medium hover:bg-[#1F7A5A] transition-colors">
                            <Download className="w-3 h-3" /> Download
                          </button>
                        ) : (
                          <button type="button" onClick={() => handleGenerateVehicleQr(v.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3A3F45] text-[11px] font-medium text-[#B7BEC4] hover:bg-[#2B3136] hover:text-white transition-colors">
                            <QrCode className="w-3 h-3" /> Generate QR
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleVehicleDetails(v.id)}
                          className={`p-2 rounded-lg text-[#B7BEC4]/60 hover:text-white hover:bg-[#2B3136] transition-colors ${isExpanded ? 'bg-[#2B3136] text-white' : ''}`}
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <button type="button" onClick={() => handleDeleteVehicle(v.id)} className="p-2 rounded-lg text-[#B7BEC4]/40 hover:text-red-400 hover:bg-red-950/30 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          {vehicleDetailLoading === v.id ? (
                            <div className="px-4 pb-5 flex justify-center">
                              <Loader2 className="w-5 h-5 animate-spin text-[#B7BEC4]/40" />
                            </div>
                          ) : (
                            <div className="px-4 pb-5 space-y-4">
                              {/* ── Maintenance Reminders ── */}
                              <div className="bg-[#1F2428]/60 rounded-xl p-4 border border-white/5">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#B7BEC4] flex items-center gap-1.5">
                                    <Wrench className="w-3.5 h-3.5" /> Maintenance Reminders
                                  </h3>
                                  <button
                                    type="button"
                                    onClick={() => openReminderModal(v.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#145A3A] text-white text-[10px] font-semibold hover:bg-[#1F7A5A] transition-colors"
                                  >
                                    <Plus className="w-3 h-3" /> Add
                                  </button>
                                </div>
                                {vReminders.length > 0 ? (
                                  <div className="space-y-2">
                                    {vReminders.map((r) => {
                                      const st = getReminderStatus(r.due_date, r.status);
                                      return (
                                        <div key={r.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-black/20 border border-white/5">
                                          <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium ${r.status === 'completed' ? 'text-[#B7BEC4]/50 line-through' : 'text-white'}`}>
                                              {r.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <span className="text-[10px] text-[#B7BEC4]/60 flex items-center gap-1">
                                                <Calendar className="w-2.5 h-2.5" />
                                                {new Date(r.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                              </span>
                                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${st.color}`}>
                                                {st.label}
                                              </span>
                                            </div>
                                          </div>
                                          {r.status === 'pending' && (
                                            <button
                                              type="button"
                                              onClick={() => handleCompleteReminder(v.id, r.id)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#3A3F45] text-[10px] font-medium text-[#B7BEC4] hover:bg-[#0F3D2E]/30 hover:text-[#9AC57A] hover:border-[#145A3A]/40 transition-colors"
                                            >
                                              <CheckCircle2 className="w-3 h-3" /> Done
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-[#B7BEC4]/40 text-center py-2">No reminders yet</p>
                                )}
                              </div>

                              {/* ── Incidents ── */}
                              <div className="bg-[#1F2428]/60 rounded-xl p-4 border border-white/5">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#B7BEC4] flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Incidents
                                  </h3>
                                  <button
                                    type="button"
                                    onClick={() => openIncidentModal(v.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600/80 text-white text-[10px] font-semibold hover:bg-red-600 transition-colors"
                                  >
                                    <Plus className="w-3 h-3" /> Report
                                  </button>
                                </div>
                                {vIncidents.length > 0 ? (
                                  <div className="space-y-2">
                                    {vIncidents.map((inc) => {
                                      const typeLabel = INCIDENT_TYPES.find((t) => t.value === inc.incident_type)?.label || inc.incident_type;
                                      return (
                                        <IncidentCard key={inc.id} incident={inc} typeLabel={typeLabel} />
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-[#B7BEC4]/40 text-center py-2">No incidents reported</p>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#B7BEC4]/60 py-4 text-center">
              {searchQuery.trim()
                ? 'No vehicles match your search.'
                : 'No vehicles added yet. Use "Add Vehicle" to register your first vehicle.'}
            </p>
          )}

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
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsVehicleModalOpen(false)} />
          <div className="relative bg-[#1F2428] rounded-[28px] w-full max-w-md p-6 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Add Vehicle</h2>
                <p className="text-xs text-[#B7BEC4]">Save your vehicle details first, then generate its QR.</p>
              </div>
              <button type="button" onClick={() => setIsVehicleModalOpen(false)} className="p-2 text-[#B7BEC4] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {vehicleError && <div className="mb-3 text-xs text-red-400">{vehicleError}</div>}

            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Vehicle Number</label>
                <input type="text" required value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())} className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition" placeholder="KA01AB1234" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Label (optional)</label>
                <input type="text" value={vehicleLabel} onChange={(e) => setVehicleLabel(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition" placeholder="E.g. Cab #21, Delivery Bike 3" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Make &amp; Model (optional)</label>
                <input type="text" value={vehicleMakeModel} onChange={(e) => setVehicleMakeModel(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition" placeholder="E.g. Tata Ace, Honda Activa" />
              </div>
              <button type="submit" disabled={vehicleSaving} className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#145A3A] text-white text-sm font-semibold hover:bg-[#1F7A5A] active:scale-[0.98] transition disabled:opacity-50">
                {vehicleSaving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving vehicle…</>) : ('Save Vehicle')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Reminder Modal ── */}
      {isReminderModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsReminderModalOpen(false)} />
          <div className="relative bg-[#1F2428] rounded-[28px] w-full max-w-md p-6 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-[#9AC57A]" /> Maintenance Reminder
                </h2>
                <p className="text-xs text-[#B7BEC4]">
                  For {fleetVehicles.find((v) => v.id === reminderVehicleId)?.vehicle_number || 'vehicle'}
                </p>
              </div>
              <button type="button" onClick={() => setIsReminderModalOpen(false)} className="p-2 text-[#B7BEC4] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {reminderError && <div className="mb-3 text-xs text-red-400">{reminderError}</div>}

            <form onSubmit={handleCreateReminder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Title</label>
                <input type="text" required value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition" placeholder="E.g. Oil Change, Tire Rotation, Insurance Renewal" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Due Date</label>
                <input type="date" required value={reminderDueDate} onChange={(e) => setReminderDueDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition [color-scheme:dark]" />
              </div>
              <button type="submit" disabled={reminderSaving} className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#145A3A] text-white text-sm font-semibold hover:bg-[#1F7A5A] active:scale-[0.98] transition disabled:opacity-50">
                {reminderSaving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>) : (<><Clock className="w-4 h-4" /> Create Reminder</>)}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Report Incident Modal ── */}
      {isIncidentModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsIncidentModalOpen(false)} />
          <div className="relative bg-[#1F2428] rounded-[28px] w-full max-w-md p-6 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" /> Report Incident
                </h2>
                <p className="text-xs text-[#B7BEC4]">
                  For {fleetVehicles.find((v) => v.id === incidentVehicleId)?.vehicle_number || 'vehicle'}
                </p>
              </div>
              <button type="button" onClick={() => setIsIncidentModalOpen(false)} className="p-2 text-[#B7BEC4] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {incidentError && <div className="mb-3 text-xs text-red-400">{incidentError}</div>}

            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Incident Type</label>
                <select required value={incidentType} onChange={(e) => setIncidentType(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition">
                  <option value="" disabled>Select type</option>
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Description</label>
                <textarea required value={incidentDescription} onChange={(e) => setIncidentDescription(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition" placeholder="Describe the incident..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Photo (optional)</label>
                {incidentImagePreview ? (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-[#3A3F45]">
                    <img src={incidentImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => { if (incidentImagePreview) URL.revokeObjectURL(incidentImagePreview); setIncidentImage(null); setIncidentImagePreview(null); if (incidentFileRef.current) incidentFileRef.current.value = ''; }} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => incidentFileRef.current?.click()} className="w-24 h-24 rounded-xl border-2 border-dashed border-[#3A3F45] flex flex-col items-center justify-center gap-1 text-[#B7BEC4]/60 hover:text-[#B7BEC4] hover:border-[#B7BEC4]/40 transition-colors">
                    <Camera className="w-5 h-5" />
                    <span className="text-[9px] uppercase tracking-wider font-semibold">Add</span>
                  </button>
                )}
                <input ref={incidentFileRef} type="file" accept="image/*" onChange={handleIncidentImageSelect} className="hidden" />
              </div>
              <button type="submit" disabled={incidentSaving} className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-[0.98] transition disabled:opacity-50">
                {incidentSaving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>) : (<><AlertTriangle className="w-4 h-4" /> Submit Report</>)}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function IncidentCard({ incident, typeLabel }: { incident: FleetIncident; typeLabel: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  const loadImage = async () => {
    if (!incident.image_path || imageUrl) return;
    setLoadingImage(true);
    const { data } = await supabase.storage.from('fleet-photos').createSignedUrl(incident.image_path, 300);
    if (data?.signedUrl) setImageUrl(data.signedUrl);
    setLoadingImage(false);
  };

  const typeColor: Record<string, string> = {
    unauthorized_use: 'text-red-400 bg-red-950/30 border-red-500/30',
    damage: 'text-amber-400 bg-amber-950/30 border-amber-500/30',
    missing_checkin: 'text-blue-400 bg-blue-950/30 border-blue-500/30',
    other: 'text-[#B7BEC4] bg-[#2B3136] border-[#3A3F45]',
  };

  return (
    <div className="py-2 px-3 rounded-lg bg-black/20 border border-white/5">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${typeColor[incident.incident_type] || typeColor.other}`}>
              {typeLabel}
            </span>
            <span className="text-[10px] text-[#B7BEC4]/50">
              {new Date(incident.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-xs text-[#B7BEC4] leading-relaxed">{incident.description}</p>
        </div>
        {incident.image_path && !imageUrl && (
          <button type="button" onClick={loadImage} className="shrink-0 w-10 h-10 rounded-lg border border-[#3A3F45] flex items-center justify-center text-[#B7BEC4]/40 hover:text-[#B7BEC4] hover:border-[#B7BEC4]/40 transition-colors">
            {loadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {imageUrl && (
        <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="block mt-2 w-32 h-32 rounded-xl overflow-hidden border border-[#3A3F45] hover:border-[#145A3A] transition-colors">
          <img src={imageUrl} alt="Incident" className="w-full h-full object-cover" />
        </a>
      )}
    </div>
  );
}
