'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { logFleetActivity } from '@/lib/fleetLogger';
import { downloadQrEmergencyCard, downloadBlobAsFile } from '@/lib/downloadQrCard';
import { duplicateVehicleMessage, normalizeVehicleNumber } from '@/lib/fleetVehicleNumber';
import { stickerNameBase } from '@/lib/stickerFilename';
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
  FileText,
  ClipboardCheck,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SiteNavbar } from '@/components/marketing/SiteNavbar';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { RequestQrReplacement } from '@/components/RequestQrReplacement';

type VehicleKind = 'two_wheeler' | 'four_wheeler';

interface FleetVehicle {
  id: string;
  owner_profile_id: string;
  vehicle_number: string;
  label: string | null;
  make_model: string | null;
  vehicle_kind?: VehicleKind | null;
  qr_token?: string | null;
  checkin_token?: string | null;
  created_at: string;
}

/** Cars / vans / trucks: 2 safety stickers + check-in. Bikes: 1 safety only. */
function needsDualSafetyAndCheckin(kind: VehicleKind | null | undefined): boolean {
  return kind !== 'two_wheeler';
}

const FLEET_VEHICLE_COLUMNS =
  'id, owner_profile_id, vehicle_number, label, make_model, vehicle_kind, qr_token, checkin_token, created_at';
const FLEET_VEHICLE_COLUMNS_LEGACY =
  'id, owner_profile_id, vehicle_number, label, make_model, qr_token, checkin_token, created_at';

function isMissingVehicleKindColumn(msg: string): boolean {
  return /vehicle_kind/i.test(msg);
}

interface VehicleDocumentRow {
  id: string;
  document_name: string;
  document_type: string;
  expiry_date: string | null;
  file_path: string;
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

interface FleetDriver {
  id: string;
  owner_profile_id: string;
  name: string;
  phone: string;
  blood_group: string | null;
  assigned_vehicle_id: string | null;
}

interface FleetCheckin {
  id: string;
  vehicle_id: string;
  driver_id: string | null;
  check_type: string;
  created_at: string;
  fleet_drivers: { name: string } | null;
}

const INCIDENT_TYPES = [
  { value: 'unauthorized_use', label: 'Unauthorized Use' },
  { value: 'damage', label: 'Damage' },
  { value: 'missing_checkin', label: 'Missing Check-In' },
  { value: 'other', label: 'Other' },
];

const FLEET_DOC_TYPES = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'registration', label: 'Registration (RC)' },
  { value: 'license', label: 'Driving License' },
  { value: 'permit', label: 'Permit' },
  { value: 'fitness', label: 'Fitness Certificate' },
  { value: 'pollution', label: 'Pollution (PUC)' },
  { value: 'other', label: 'Other' },
];

function getReminderStatus(dueDate: string, status: string): { label: string; color: string } {
  if (status === 'completed') return { label: 'Completed', color: 'text-[#5a9c32] bg-[#89d957]/10 border-[#89d957]/20' };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: 'text-red-600 bg-red-50 border-red-200' };
  if (diffDays <= 7) return { label: `${diffDays}d left`, color: 'text-amber-600 bg-amber-50 border-amber-200' };
  return { label: `${diffDays}d left`, color: 'text-neutral-600 bg-neutral-50 border-neutral-200' };
}

const DOC_TYPES = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'registration', label: 'Registration (RC)' },
  { value: 'license', label: 'Driving License' },
  { value: 'permit', label: 'Permit' },
  { value: 'fitness', label: 'Fitness Certificate' },
  { value: 'pollution', label: 'Pollution (PUC)' },
  { value: 'other', label: 'Other' },
];

export default function FleetManagerPage() {
  const [loading, setLoading] = useState(true);
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleLabel, setVehicleLabel] = useState('');
  const [vehicleMakeModel, setVehicleMakeModel] = useState('');
  const [vehicleKind, setVehicleKind] = useState<VehicleKind>('four_wheeler');
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  // Document states inside Add Vehicle Modal
  const [vehicleDocFile, setVehicleDocFile] = useState<File | null>(null);
  const [vehicleDocType, setVehicleDocType] = useState('registration');
  const [vehicleDocName, setVehicleDocName] = useState('Registration Certificate (RC)');
  const [vehicleDocExpiryDate, setVehicleDocExpiryDate] = useState('');
  const [vehicleDocNotes, setVehicleDocNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fleetDrivers, setFleetDrivers] = useState<FleetDriver[]>([]);
  const [latestCheckins, setLatestCheckins] = useState<FleetCheckin[]>([]);

  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Record<string, MaintenanceReminder[]>>({});
  const [incidents, setIncidents] = useState<Record<string, FleetIncident[]>>({});
  const [vehicleDocs, setVehicleDocs] = useState<Record<string, VehicleDocumentRow[]>>({});
  const [vehicleDetailLoading, setVehicleDetailLoading] = useState<string | null>(null);
  /** Blocks double-taps: `${vehicleId}:all|v|h|checkin` */
  const [stickerBusyKey, setStickerBusyKey] = useState<string | null>(null);
  const stickerBusyRef = useRef(false);

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

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docVehicleId, setDocVehicleId] = useState<string | null>(null);
  const [docType, setDocType] = useState('');
  const [docName, setDocName] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docExpiryDate, setDocExpiryDate] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docSaving, setDocSaving] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

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

      let vehiclesRes = await supabase
        .from('fleet_vehicles')
        .select(FLEET_VEHICLE_COLUMNS)
        .eq('owner_profile_id', user.id)
        .order('created_at', { ascending: false });

      if (vehiclesRes.error && isMissingVehicleKindColumn(vehiclesRes.error.message)) {
        // Legacy DB without vehicle_kind — same shape at runtime, TS select strings differ.
        vehiclesRes = (await supabase
          .from('fleet_vehicles')
          .select(FLEET_VEHICLE_COLUMNS_LEGACY)
          .eq('owner_profile_id', user.id)
          .order('created_at', { ascending: false })) as typeof vehiclesRes;
      }

      const [{ data, error }, { data: driversData, error: driversError }, { data: checkinsData, error: checkinsError }] = [
        vehiclesRes,
        await supabase
          .from('fleet_drivers')
          .select('id, owner_profile_id, name, phone, blood_group, assigned_vehicle_id')
          .eq('owner_profile_id', user.id),
        await supabase
          .from('fleet_checkins')
          .select('id, vehicle_id, driver_id, check_type, created_at, fleet_drivers(name)')
          .eq('owner_profile_id', user.id)
          .order('created_at', { ascending: false }),
      ];

      if (error) {
        console.error('FleetManager: error fetching vehicles:', error);
      }
      if (driversError) {
        console.error('FleetManager: error fetching drivers:', driversError);
      }
      if (checkinsError) {
        console.error('FleetManager: error fetching checkins:', checkinsError);
      }

      setFleetVehicles(data || []);
      setFleetDrivers((driversData as FleetDriver[]) || []);
      setLatestCheckins((checkinsData as any[]) || []);
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

    if (
      reminders[vehicleId] &&
      incidents[vehicleId] &&
      vehicleDocs[vehicleId] !== undefined
    ) {
      return;
    }

    setVehicleDetailLoading(vehicleId);
    try {
      const [{ data: rems }, { data: incs }, { data: docs }] = await Promise.all([
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
        supabase
          .from('fleet_documents')
          .select('id, document_name, document_type, expiry_date, file_path, created_at')
          .eq('vehicle_id', vehicleId)
          .order('created_at', { ascending: false }),
      ]);
      setReminders((prev) => ({ ...prev, [vehicleId]: (rems as MaintenanceReminder[]) || [] }));
      setIncidents((prev) => ({ ...prev, [vehicleId]: (incs as FleetIncident[]) || [] }));
      setVehicleDocs((prev) => ({ ...prev, [vehicleId]: (docs as VehicleDocumentRow[]) || [] }));
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
    const vNum = vehicleNumber.trim();
    if (!vNum) {
      setVehicleError('Vehicle number is required.');
      return;
    }
    if (!/^[a-zA-Z0-9]{4,15}$/.test(vNum)) {
      setVehicleError('Vehicle number must be alphanumeric and between 4 and 15 characters (no spaces or special characters).');
      return;
    }

    const normalizedNum = normalizeVehicleNumber(vNum);
    if (
      fleetVehicles.some(
        (v) => normalizeVehicleNumber(v.vehicle_number) === normalizedNum
      )
    ) {
      setVehicleError(duplicateVehicleMessage(vNum));
      return;
    }

    setVehicleSaving(true);
    try {
      const { data: existing } = await supabase
        .from('fleet_vehicles')
        .select('id, vehicle_number')
        .eq('owner_profile_id', user.id);

      if (
        existing?.some(
          (v) => normalizeVehicleNumber(v.vehicle_number) === normalizedNum
        )
      ) {
        setVehicleError(duplicateVehicleMessage(vNum));
        return;
      }

      // 1. Insert vehicle
      const row = {
        owner_profile_id: user.id,
        vehicle_number: normalizedNum,
        label: vehicleLabel.trim() || null,
        make_model: vehicleMakeModel.trim() || null,
        vehicle_kind: vehicleKind,
      };

      let insertRes = await supabase.from('fleet_vehicles').insert(row).select().single();

      if (insertRes.error && isMissingVehicleKindColumn(insertRes.error.message)) {
        const { vehicle_kind: _drop, ...legacyRow } = row;
        insertRes = await supabase.from('fleet_vehicles').insert(legacyRow).select().single();
      }

      const { data, error } = insertRes;

      if (error) {
        console.error('FleetManager: failed to create fleet vehicle:', error);
        if (error.code === '23505') {
          setVehicleError(duplicateVehicleMessage(vNum));
        } else if (isMissingVehicleKindColumn(error.message)) {
          setVehicleError(
            'Database missing vehicle_kind column. In Supabase SQL Editor run: alter table public.fleet_vehicles add column if not exists vehicle_kind text;'
          );
        } else {
          setVehicleError(error.message ?? 'Failed to save vehicle.');
        }
        return;
      }

      // 2. If a document file is selected, upload and insert document
      if (data && vehicleDocFile) {
        const ext = vehicleDocFile.name.split('.').pop() || 'pdf';
        const filePath = `${user.id}/${data.id}_${Date.now()}_${vehicleDocName.trim().replace(/\s+/g, '_')}.${ext}`;

        const { error: storageError } = await supabase.storage
          .from('fleet-documents')
          .upload(filePath, vehicleDocFile);

        if (storageError) {
          console.error('Failed to upload vehicle document:', storageError);
          setVehicleError('Vehicle saved, but document upload failed: ' + storageError.message);
          return;
        }

        const { error: dbError } = await supabase
          .from('fleet_documents')
          .insert({
            owner_profile_id: user.id,
            document_type: vehicleDocType,
            document_name: vehicleDocName.trim(),
            file_path: filePath,
            vehicle_id: data.id,
            driver_id: null,
            expiry_date: vehicleDocExpiryDate || null,
            notes: vehicleDocNotes.trim() || null,
          });

        if (dbError) {
          console.error('Failed to save vehicle document record:', dbError);
          setVehicleError('Vehicle saved, but document record failed: ' + dbError.message);
          return;
        }
      }

      setFleetVehicles((prev) => [
        { ...(data as FleetVehicle), vehicle_kind: (data as FleetVehicle).vehicle_kind ?? vehicleKind },
        ...prev,
      ]);
      await handleGenerateVehicleQr(data.id);
      // Cars+: also create check-in QR (2 safety stickers share one safety token)
      if (needsDualSafetyAndCheckin(vehicleKind)) {
        await handleGenerateCheckinQr(data.id);
      }

      await logFleetActivity({
        action: 'vehicle_added',
        entityType: 'vehicle',
        entityId: data.id,
        description: `Added vehicle ${vNum}`,
        metadata: {
          vehicle_number: vNum,
          label: vehicleLabel.trim() || null,
          make_model: vehicleMakeModel.trim() || null,
          vehicle_kind: vehicleKind,
        },
      });

      setVehicleNumber('');
      setVehicleLabel('');
      setVehicleMakeModel('');
      setVehicleKind('four_wheeler');
      setVehicleDocFile(null);
      setVehicleDocType('registration');
      setVehicleDocName('Registration Certificate (RC)');
      setVehicleDocExpiryDate('');
      setVehicleDocNotes('');
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
        window.alert(data.error ?? 'Failed to generate QR for this vehicle.');
        return;
      }
      if (!data.token) return;

      setFleetVehicles((prev) =>
        prev.map((v) => (v.id === vehicleId ? { ...v, qr_token: data.token } : v))
      );
    } catch (err) {
      console.error('FleetManager: generateVehicleQr client error:', err);
      window.alert('Failed to generate QR. Please try again.');
    }
  };

  const handleGenerateCheckinQr = async (vehicleId: string, regenerate?: boolean) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;

      const res = await fetch('/api/fleet/generate-checkin-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ vehicleId, regenerate: !!regenerate }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('FleetManager: generate check-in QR:', data.error);
        return;
      }
      setFleetVehicles((prev) =>
        prev.map((v) => (v.id === vehicleId ? { ...v, checkin_token: data.token } : v))
      );
      if (regenerate && typeof window !== 'undefined') {
        window.alert(
          'A new check-in QR was created. Old QR codes will no longer work — print or share the new one.'
        );
      }
    } catch (err) {
      console.error('FleetManager: generateCheckinQr:', err);
    }
  };

  const handleDownloadVehicleQr = async (
    vehicle: FleetVehicle,
    style: 'v' | 'h' = 'v'
  ) => {
    if (!vehicle.qr_token) return;
    const key = `${vehicle.id}:${style}`;
    if (stickerBusyRef.current) return;
    stickerBusyRef.current = true;
    setStickerBusyKey(key);
    try {
      const base = stickerNameBase(vehicle.vehicle_number, profileName);
      const filename =
        style === 'h' ? `${base}-safety-side.png` : `${base}-safety-rear.png`;
      await downloadQrEmergencyCard(vehicle.qr_token, filename, style);
    } catch (err) {
      console.error('FleetManager: failed to download vehicle QR:', err);
      window.alert('Could not download safety QR. Generate the QR first, then try again.');
    } finally {
      stickerBusyRef.current = false;
      setStickerBusyKey(null);
    }
  };

  const handleDownloadCheckinQr = async (vehicle: FleetVehicle) => {
    const key = `${vehicle.id}:checkin`;
    if (stickerBusyRef.current) return;
    stickerBusyRef.current = true;
    setStickerBusyKey(key);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;

      const res = await fetch(
        `/api/fleet/checkin-qr-image?vehicleId=${encodeURIComponent(vehicle.id)}`,
        { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }
      );
      if (!res.ok) {
        console.error('FleetManager: check-in QR download error', await res.text());
        window.alert('Could not download check-in QR. Generate it first, then try again.');
        return;
      }
      const filename = `${stickerNameBase(vehicle.vehicle_number, profileName)}-checkin.png`;
      await downloadBlobAsFile(await res.blob(), filename);
    } catch (err) {
      console.error('FleetManager: download check-in QR:', err);
      window.alert('Could not download check-in QR. Please try again.');
    } finally {
      stickerBusyRef.current = false;
      setStickerBusyKey(null);
    }
  };

  const handleDownloadAllStickers = async (vehicle: FleetVehicle) => {
    const key = `${vehicle.id}:all`;
    if (stickerBusyRef.current) return;
    stickerBusyRef.current = true;
    setStickerBusyKey(key);
    try {
      if (!vehicle.qr_token) {
        window.alert('Generate the safety QR first.');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;

      const res = await fetch(
        `/api/fleet/download-vehicle-stickers?vehicleId=${encodeURIComponent(vehicle.id)}`,
        { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }
      );
      if (!res.ok) {
        console.error('FleetManager: download-all error', await res.text());
        window.alert('Could not download stickers zip. Try again.');
        return;
      }
      const zipName = `${stickerNameBase(vehicle.vehicle_number, profileName)}.zip`;
      await downloadBlobAsFile(await res.blob(), zipName);

      // Refresh vehicle so check-in token shows if it was auto-created.
      const { data: refreshed } = await supabase
        .from('fleet_vehicles')
        .select('checkin_token')
        .eq('id', vehicle.id)
        .maybeSingle();
      if (refreshed?.checkin_token) {
        setFleetVehicles((prev) =>
          prev.map((v) =>
            v.id === vehicle.id ? { ...v, checkin_token: refreshed.checkin_token } : v
          )
        );
      }
    } catch (err) {
      console.error('FleetManager: download all stickers:', err);
      window.alert('Could not download stickers zip. Please try again.');
    } finally {
      stickerBusyRef.current = false;
      setStickerBusyKey(null);
    }
  };

  const handleFleetDocOpen = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('fleet-documents')
        .createSignedUrl(filePath, 300);
      if (error || !data?.signedUrl) {
        window.alert('Could not open document. Please try again.');
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Doc open:', err);
      window.alert('Could not open document.');
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

  const openDocModal = (vehicleId: string) => {
    setDocVehicleId(vehicleId);
    setDocType('');
    setDocName('');
    setDocFile(null);
    setDocExpiryDate('');
    setDocNotes('');
    setDocError(null);
    setIsDocModalOpen(true);
  };

  const handleFleetDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile || !docType || !docName.trim() || !docVehicleId) return;
    setDocSaving(true);
    setDocError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const ext = docFile.name.split('.').pop() || 'pdf';
      const filePath = `${user.id}/${Date.now()}_${docName.replace(/\s+/g, '_')}.${ext}`;
      const { error: storageError } = await supabase.storage
        .from('fleet-documents')
        .upload(filePath, docFile);
      if (storageError) {
        setDocError(storageError.message);
        return;
      }

      const { data: inserted, error: dbError } = await supabase
        .from('fleet_documents')
        .insert({
          owner_profile_id: user.id,
          document_type: docType,
          document_name: docName.trim(),
          file_path: filePath,
          vehicle_id: docVehicleId,
          driver_id: null,
          expiry_date: docExpiryDate || null,
          notes: docNotes.trim() || null,
        })
        .select('id, document_name, document_type, expiry_date, file_path, created_at')
        .single();

      if (dbError || !inserted) {
         setDocError(dbError?.message || 'Save failed');
        return;
      }

      setVehicleDocs((prev) => ({
        ...prev,
        [docVehicleId]: [inserted as VehicleDocumentRow, ...(prev[docVehicleId] || [])],
      }));

      const vehicleName = fleetVehicles.find((v) => v.id === docVehicleId)?.vehicle_number || '';
      await logFleetActivity({
        action: 'document_uploaded',
        entityType: 'document',
        entityId: inserted.id,
        description: `Uploaded ${FLEET_DOC_TYPES.find((t) => t.value === docType)?.label || docType}: ${docName.trim()} for ${vehicleName}`,
        metadata: { vehicle_id: docVehicleId, document_type: docType },
      });

      setIsDocModalOpen(false);
      setDocType('');
      setDocName('');
      setDocFile(null);
      setDocExpiryDate('');
      setDocNotes('');
      if (docFileRef.current) docFileRef.current.value = '';
    } catch (err) {
      console.error('Fleet doc upload:', err);
      setDocError('Something went wrong.');
    } finally {
      setDocSaving(false);
    }
  };

  const handleFleetDocDownload = async (filePath: string, name: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('fleet-documents')
        .createSignedUrl(filePath, 300);
      if (error || !data?.signedUrl) {
        window.alert('Could not download document.');
        return;
      }
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = name;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Doc download:', err);
      window.alert('Could not download document.');
    }
  };

  const handleFleetDocDelete = async (vehicleId: string, doc: VehicleDocumentRow) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${doc.document_name}"?`)) return;
    try {
      await supabase.storage.from('fleet-documents').remove([doc.file_path]);
      const { error } = await supabase.from('fleet_documents').delete().eq('id', doc.id);
      if (error) return;
      setVehicleDocs((prev) => ({
        ...prev,
        [vehicleId]: (prev[vehicleId] || []).filter((d) => d.id !== doc.id),
      }));
      await logFleetActivity({
        action: 'document_deleted',
        entityType: 'document',
        entityId: doc.id,
        description: `Deleted ${doc.document_type}: ${doc.document_name}`,
      });
    } catch (err) {
      console.error('Doc delete:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white bg-rexu-grid flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#89d957]" />
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
    <div className="min-h-screen flex flex-col font-sans">
      <SiteNavbar title="Vehicle Manager" subtitle="Vehicles" backUrl="/dashboard" />
      <div className="flex-1 flex bg-white bg-rexu-grid text-neutral-900">
        <DashboardSidebar activePath="/fleet" />
        <div className="flex-1 flex flex-col min-h-[calc(100vh-72px)]">
          <motion.main
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
            className="flex-1 p-8 space-y-6 bg-transparent"
          >
        {/* ── Welcome card with stats ── */}
        <section className="bg-white rounded-[24px] p-8 shadow-sm border border-neutral-200/50">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                Welcome, {profileName}
              </h1>
              <p className="text-neutral-500 text-sm max-w-lg leading-relaxed">
                Manage all your fleet vehicles, generate QR codes, and download stickers from a
                single place.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-center justify-center px-5 py-3 rounded-xl border border-neutral-200 bg-neutral-50 min-w-[72px]">
                <span className="text-2xl font-bold text-neutral-800">{fleetVehicles.length}</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-400 font-semibold">Vehicles</span>
              </div>
              <div className="flex flex-col items-center justify-center px-5 py-3 rounded-xl bg-[#89d957]/10 border border-[#89d957]/20 min-w-[72px]">
                <span className="text-2xl font-bold text-[#5a9c32]">{qrReadyCount}</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#5a9c32] font-semibold">QR Ready</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Vehicles section ── */}
        <section className="bg-white rounded-[24px] p-6 shadow-sm border border-neutral-200/50 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-neutral-800">Fleet Vehicles</h2>
              <p className="text-sm text-neutral-400 mt-0.5">Add, manage and download QR codes</p>
            </div>
            <button
              type="button"
              onClick={() => setIsVehicleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#89d957] to-[#74c346] text-white text-sm font-semibold hover:opacity-95 shadow-sm active:scale-[0.97] transition"
            >
              <Plus className="w-4 h-4" /> Add Vehicle
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by number, label, or make & model..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
            />
          </div>

          {filteredVehicles.length > 0 ? (
            <div className="rounded-xl border border-neutral-200/60 divide-y divide-neutral-200/60">
              {filteredVehicles.map((v) => {
                const isExpanded = expandedVehicle === v.id;
                const vReminders = reminders[v.id] || [];
                const vIncidents = incidents[v.id] || [];
                const vDocs = vehicleDocs[v.id] || [];
                const pendingReminders = vReminders.filter((r) => r.status === 'pending');
                const overdueCount = pendingReminders.filter((r) => {
                  const now = new Date(); now.setHours(0, 0, 0, 0);
                  return new Date(r.due_date) < now;
                }).length;

                return (
                  <div key={v.id}>
                    <div className="px-4 py-4 flex items-center gap-4 hover:bg-neutral-50/50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5 text-neutral-500" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-sm text-neutral-800">{v.vehicle_number}</span>
                          {v.qr_token ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5a9c32] bg-[#89d957]/10 border border-[#89d957]/20 rounded-full px-2 py-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#89d957]" /> QR Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-400 bg-neutral-50 border border-neutral-200 rounded-full px-2 py-0.5">
                              No QR
                            </span>
                          )}
                          {(() => {
                            const latestCheckin = latestCheckins.find((c) => c.vehicle_id === v.id);
                            const isActive = latestCheckin && latestCheckin.check_type === 'check_in';
                            const activeDriverName = isActive
                              ? (fleetDrivers.find((d) => d.id === latestCheckin.driver_id)?.name || latestCheckin.fleet_drivers?.name || 'Unknown Driver')
                              : null;

                            if (isActive) {
                              return (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#2d7d1e] bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
                                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                  </span>
                                  <span>Active: {activeDriverName}</span>
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-full px-2.5 py-0.5">
                                Inactive (Idle)
                              </span>
                            );
                          })()}
                          {overdueCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                              <AlertTriangle className="w-2.5 h-2.5 text-red-500" /> {overdueCount} overdue
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                          {v.label && <span>{v.label}</span>}
                          {v.make_model && <span className="text-neutral-400">{v.make_model}</span>}
                          <span className="text-neutral-400">
                            {v.vehicle_kind === 'two_wheeler' ? '2-wheeler' : '3+/4-wheeler'}
                          </span>
                          {(() => {
                            const permanentDriver = fleetDrivers.find((d) => d.assigned_vehicle_id === v.id);
                            if (permanentDriver) {
                              return (
                                <span className="text-neutral-400">
                                  Permanent Driver: <strong className="text-neutral-600 font-semibold">{permanentDriver.name}</strong>
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        {v.qr_token ? (
                          needsDualSafetyAndCheckin(v.vehicle_kind) ? (
                            <>
                              <button
                                type="button"
                                disabled={!!stickerBusyKey}
                                onClick={() => void handleDownloadAllStickers(v)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#89d957]/50 bg-[#89d957]/10 text-[#3f7a1f] text-[11px] font-semibold hover:bg-[#89d957]/20 transition active:scale-[0.96] disabled:opacity-60 disabled:pointer-events-none"
                                title="Zip: safety rear + side + check-in"
                              >
                                {stickerBusyKey === `${v.id}:all` ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Download className="w-3 h-3" />
                                )}
                                {stickerBusyKey === `${v.id}:all` ? 'Preparing…' : 'Download all'}
                              </button>
                              <button
                                type="button"
                                disabled={!!stickerBusyKey}
                                onClick={() => void handleDownloadVehicleQr(v, 'v')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#89d957] to-[#74c346] text-white text-[11px] font-medium hover:opacity-95 transition active:scale-[0.96] shadow-sm disabled:opacity-60 disabled:pointer-events-none"
                                title="Rear safety sticker (Model V)"
                              >
                                {stickerBusyKey === `${v.id}:v` ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Download className="w-3 h-3" />
                                )}
                                {stickerBusyKey === `${v.id}:v` ? 'Preparing…' : 'Safety (rear)'}
                              </button>
                              <button
                                type="button"
                                disabled={!!stickerBusyKey}
                                onClick={() => void handleDownloadVehicleQr(v, 'h')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#89d957] to-[#74c346] text-white text-[11px] font-medium hover:opacity-95 transition active:scale-[0.96] shadow-sm disabled:opacity-60 disabled:pointer-events-none"
                                title="Side safety sticker (Model H)"
                              >
                                {stickerBusyKey === `${v.id}:h` ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Download className="w-3 h-3" />
                                )}
                                {stickerBusyKey === `${v.id}:h` ? 'Preparing…' : 'Safety (side)'}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={!!stickerBusyKey}
                              onClick={() => void handleDownloadVehicleQr(v, 'v')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#89d957] to-[#74c346] text-white text-[11px] font-medium hover:opacity-95 transition active:scale-[0.96] shadow-sm disabled:opacity-60 disabled:pointer-events-none"
                            >
                              {stickerBusyKey === `${v.id}:v` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              {stickerBusyKey === `${v.id}:v` ? 'Preparing…' : 'Safety QR'}
                            </button>
                          )
                        ) : (
                          <button type="button" onClick={() => handleGenerateVehicleQr(v.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                            <QrCode className="w-3 h-3 text-neutral-500" /> Generate QR
                          </button>
                        )}
                        {v.qr_token && (
                          <RequestQrReplacement
                            variant="compact"
                            segment="fleet"
                            qrToken={v.qr_token}
                            vehicleId={v.id}
                            vehicleNumber={v.vehicle_number}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => toggleVehicleDetails(v.id)}
                          className={`p-2 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-50 transition-colors ${isExpanded ? 'bg-neutral-50 text-neutral-800' : ''}`}
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <button type="button" onClick={() => handleDeleteVehicle(v.id)} className="p-2 rounded-lg text-neutral-300 hover:text-red-600 hover:bg-red-50 transition-colors">
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
                              <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                            </div>
                          ) : (
                            <div className="px-4 pb-5 space-y-4">
                              {/* Driver check-in QR — cars+ only */}
                              {needsDualSafetyAndCheckin(v.vehicle_kind) && (
                              <div className="bg-neutral-50/50 rounded-xl p-4 border border-neutral-100">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                  <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                                      <ClipboardCheck className="w-3.5 h-3.5 text-neutral-400" /> Driver check-in QR
                                    </h3>
                                    <p className="text-[10px] text-neutral-400 mt-1 max-w-md leading-relaxed">
                                      Scan to check in or out and attach photos. No sign-in required for drivers.
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-2 shrink-0">
                                    {!v.checkin_token ? (
                                      <button
                                        type="button"
                                        onClick={() => handleGenerateCheckinQr(v.id)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#89d957] to-[#74c346] text-white text-[10px] font-semibold hover:opacity-95"
                                      >
                                        <QrCode className="w-3 h-3" /> Generate check-in QR
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          disabled={!!stickerBusyKey}
                                          onClick={() => void handleDownloadCheckinQr(v)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#89d957] to-[#74c346] text-white text-[10px] font-semibold hover:opacity-95 transition active:scale-[0.96] disabled:opacity-60 disabled:pointer-events-none"
                                        >
                                          {stickerBusyKey === `${v.id}:checkin` ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Download className="w-3 h-3" />
                                          )}
                                          {stickerBusyKey === `${v.id}:checkin` ? 'Preparing…' : 'Download QR'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleGenerateCheckinQr(v.id, true)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
                                        >
                                          New QR
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              )}

                              {/* Documents for this vehicle */}
                              <div className="bg-neutral-50/50 rounded-xl p-4 border border-neutral-100">
                                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-neutral-400" /> Vehicle documents
                                  </h3>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openDocModal(v.id)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#89d957] to-[#74c346] text-white text-[10px] font-semibold hover:opacity-95"
                                    >
                                      <Upload className="w-3 h-3" /> Upload
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => router.push(`/documents?vehicle=${v.id}`)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-200 text-[10px] font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
                                    >
                                      Open documents page
                                    </button>
                                  </div>
                                </div>
                                {vDocs.length > 0 ? (
                                  <div className="space-y-2">
                                    {vDocs.map((d) => (
                                      <div
                                        key={d.id}
                                        className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white border border-neutral-200/50 shadow-sm"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-neutral-800 truncate">{d.document_name}</p>
                                          <p className="text-[10px] text-neutral-400">
                                            {FLEET_DOC_TYPES.find((t) => t.value === d.document_type)?.label ||
                                              d.document_type}
                                            {d.expiry_date &&
                                              ` · exp. ${new Date(d.expiry_date).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                              })}`}
                                          </p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => void handleFleetDocOpen(d.file_path)}
                                          className="px-2 py-1 rounded-lg text-[10px] font-semibold text-[#5a9c32] hover:bg-neutral-50"
                                        >
                                          Open
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleFleetDocDownload(d.file_path, d.document_name)}
                                          className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
                                          title="Download"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleFleetDocDelete(v.id, d)}
                                          className="p-1.5 rounded-lg text-neutral-300 hover:text-red-600 hover:bg-red-50"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-neutral-400 text-center py-2">
                                    No documents linked to this vehicle yet.
                                  </p>
                                )}
                              </div>

                              {/* ── Maintenance Reminders ── */}
                              <div className="bg-neutral-50/50 rounded-xl p-4 border border-neutral-100">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                                    <Wrench className="w-3.5 h-3.5 text-neutral-400" /> Maintenance Reminders
                                  </h3>
                                  <button
                                    type="button"
                                    onClick={() => openReminderModal(v.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#89d957] to-[#74c346] text-white text-[10px] font-semibold hover:opacity-95 transition-colors"
                                  >
                                    <Plus className="w-3 h-3" /> Add
                                  </button>
                                </div>
                                {vReminders.length > 0 ? (
                                  <div className="space-y-2">
                                    {vReminders.map((r) => {
                                      const st = getReminderStatus(r.due_date, r.status);
                                      return (
                                        <div key={r.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white border border-neutral-200/50 shadow-sm">
                                          <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium ${r.status === 'completed' ? 'text-neutral-400 line-through' : 'text-neutral-800'}`}>
                                              {r.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                                                <Calendar className="w-2.5 h-2.5 text-neutral-400" />
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
                                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-[10px] font-medium text-neutral-600 hover:bg-[#89d957]/10 hover:text-[#5a9c32] hover:border-[#89d957]/30 transition-colors"
                                            >
                                              <CheckCircle2 className="w-3 h-3 text-[#5a9c32]" /> Done
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-neutral-400 text-center py-2">No reminders yet</p>
                                )}
                              </div>

                              {/* ── Incidents ── */}
                              <div className="bg-neutral-50/50 rounded-xl p-4 border border-neutral-100">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-neutral-400" /> Incidents
                                  </h3>
                                  <button
                                    type="button"
                                    onClick={() => openIncidentModal(v.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 text-white text-[10px] font-semibold hover:bg-neutral-800 transition-colors"
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
                                  <p className="text-xs text-neutral-400 text-center py-2">No incidents reported</p>
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
            <p className="text-sm text-neutral-400 py-4 text-center">
              {searchQuery.trim()
                ? 'No vehicles match your search.'
                : 'No vehicles added yet. Use "Add Vehicle" to register your first vehicle.'}
            </p>
          )}

          {fleetVehicles.length > 0 && (
            <p className="text-xs text-neutral-400 pt-1">
              Showing {filteredVehicles.length} of {fleetVehicles.length} vehicles
            </p>
          )}
        </section>
      </motion.main>

      {/* ── Add Vehicle Modal ── */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setIsVehicleModalOpen(false)} />
          <div className="relative bg-white rounded-[24px] w-full max-w-md p-6 shadow-2xl border border-neutral-200/60">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-800">Add Vehicle</h2>
                <p className="text-xs text-neutral-400">Cars get 2 safety stickers + check-in; bikes get 1 safety sticker.</p>
              </div>
              <button type="button" onClick={() => setIsVehicleModalOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {vehicleError && <div className="mb-3 text-xs text-red-500">{vehicleError}</div>}

            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Vehicle Number</label>
                <input type="text" required value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition" placeholder="KA01AB1234" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Label (optional)</label>
                <input type="text" value={vehicleLabel} onChange={(e) => setVehicleLabel(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition" placeholder="E.g. Cab #21, Delivery Bike 3" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Vehicle type</label>
                <select
                  required
                  value={vehicleKind}
                  onChange={(e) => setVehicleKind(e.target.value as VehicleKind)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                >
                  <option value="four_wheeler">Car / van / truck (3+ wheels) — 2 safety + 1 check-in</option>
                  <option value="two_wheeler">Bike / scooter (2-wheeler) — 1 safety QR</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Make &amp; Model (optional)</label>
                <input type="text" value={vehicleMakeModel} onChange={(e) => setVehicleMakeModel(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition" placeholder="E.g. Tata Ace, Honda Activa" />
              </div>

              <div className="border-t border-neutral-100 pt-4 mt-2 space-y-4">
                <span className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Attach Vehicle Document (Optional)
                </span>

                {/* Hidden file inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setVehicleDocFile(e.target.files[0]);
                      if (!vehicleDocName || vehicleDocName === 'Registration Certificate (RC)') {
                        setVehicleDocName(e.target.files[0].name.split('.')[0] || 'Registration Certificate (RC)');
                      }
                    }
                  }}
                  className="hidden"
                />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setVehicleDocFile(e.target.files[0]);
                      if (!vehicleDocName || vehicleDocName === 'Registration Certificate (RC)') {
                        setVehicleDocName(`Camera_Capture_${Date.now()}`);
                      }
                    }
                  }}
                  className="hidden"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-600 hover:bg-neutral-50 active:scale-[0.98] transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-neutral-500" />
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-600 hover:bg-neutral-50 active:scale-[0.98] transition"
                  >
                    <Camera className="w-3.5 h-3.5 text-neutral-500" />
                    Take Photo
                  </button>
                </div>

                {vehicleDocFile && (
                  <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-3 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-neutral-400 truncate">Selected File:</p>
                        <p className="text-xs font-medium text-neutral-700 truncate">{vehicleDocFile.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setVehicleDocFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          if (cameraInputRef.current) cameraInputRef.current.value = '';
                        }}
                        className="text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                        Document Type
                      </label>
                      <select
                        value={vehicleDocType}
                        onChange={(e) => setVehicleDocType(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#89d957]"
                      >
                        {DOC_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                        Document Name
                      </label>
                      <input
                        type="text"
                        required
                        value={vehicleDocName}
                        onChange={(e) => setVehicleDocName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#89d957]"
                        placeholder="Registration Certificate (RC), Insurance, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                        Expiry Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={vehicleDocExpiryDate}
                        onChange={(e) => setVehicleDocExpiryDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#89d957]"
                      />
                    </div>
                  </div>
                )}
              </div>
              <button type="submit" disabled={vehicleSaving} className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#89d957] to-[#74c346] text-white text-sm font-semibold hover:opacity-95 shadow-sm active:scale-[0.98] transition disabled:opacity-50">
                {vehicleSaving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving vehicle…</>) : ('Save Vehicle')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Reminder Modal ── */}
      {isReminderModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setIsReminderModalOpen(false)} />
          <div className="relative bg-white rounded-[24px] w-full max-w-md p-6 shadow-2xl border border-neutral-200/60">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-[#5a9c32]" /> Maintenance Reminder
                </h2>
                <p className="text-xs text-neutral-400">
                  For {fleetVehicles.find((v) => v.id === reminderVehicleId)?.vehicle_number || 'vehicle'}
                </p>
              </div>
              <button type="button" onClick={() => setIsReminderModalOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {reminderError && <div className="mb-3 text-xs text-red-500">{reminderError}</div>}

            <form onSubmit={handleCreateReminder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Title</label>
                <input type="text" required value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition" placeholder="E.g. Oil Change, Tire Rotation, Insurance Renewal" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Due Date</label>
                <input type="date" required value={reminderDueDate} onChange={(e) => setReminderDueDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition" />
              </div>
              <button type="submit" disabled={reminderSaving} className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#89d957] to-[#74c346] text-white text-sm font-semibold hover:opacity-95 shadow-sm active:scale-[0.98] transition disabled:opacity-50">
                {reminderSaving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>) : (<><Clock className="w-4 h-4" /> Create Reminder</>)}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Report Incident Modal ── */}
      {isIncidentModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setIsIncidentModalOpen(false)} />
          <div className="relative bg-white rounded-[24px] w-full max-w-md p-6 shadow-2xl border border-neutral-200/60">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" /> Report Incident
                </h2>
                <p className="text-xs text-neutral-400">
                  For {fleetVehicles.find((v) => v.id === incidentVehicleId)?.vehicle_number || 'vehicle'}
                </p>
              </div>
              <button type="button" onClick={() => setIsIncidentModalOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {incidentError && <div className="mb-3 text-xs text-red-500">{incidentError}</div>}

            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Incident Type</label>
                <select required value={incidentType} onChange={(e) => setIncidentType(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-850 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition">
                  <option value="" disabled>Select type</option>
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Description</label>
                <textarea required value={incidentDescription} onChange={(e) => setIncidentDescription(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-850 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition" placeholder="Describe the incident..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Photo (optional)</label>
                {incidentImagePreview ? (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-neutral-200">
                    <img src={incidentImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => { if (incidentImagePreview) URL.revokeObjectURL(incidentImagePreview); setIncidentImage(null); setIncidentImagePreview(null); if (incidentFileRef.current) incidentFileRef.current.value = ''; }} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => incidentFileRef.current?.click()} className="w-24 h-24 rounded-xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-1 text-neutral-400 hover:text-neutral-600 hover:border-neutral-300 transition-colors">
                    <Camera className="w-5 h-5" />
                    <span className="text-[9px] uppercase tracking-wider font-semibold">Add</span>
                  </button>
                )}
                <input ref={incidentFileRef} type="file" accept="image/*" onChange={handleIncidentImageSelect} className="hidden" />
              </div>
              <button type="submit" disabled={incidentSaving} className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 active:scale-[0.98] transition disabled:opacity-50">
                {incidentSaving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>) : (<><AlertTriangle className="w-4 h-4" /> Submit Report</>)}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Upload document for vehicle ── */}
      {isDocModalOpen && docVehicleId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setIsDocModalOpen(false)} />
          <div className="relative bg-white rounded-[24px] w-full max-w-md p-6 shadow-2xl border border-neutral-200/60 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#5a9c32]" /> Upload document
                </h2>
                <p className="text-xs text-neutral-400">
                  For {fleetVehicles.find((x) => x.id === docVehicleId)?.vehicle_number || 'vehicle'}
                </p>
              </div>
              <button type="button" onClick={() => setIsDocModalOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {docError && <div className="mb-3 text-xs text-red-500">{docError}</div>}

            <form onSubmit={handleFleetDocUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Document type</label>
                <select
                  required
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-850 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                >
                  <option value="" disabled>Select type</option>
                  {FLEET_DOC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Document name</label>
                <input
                  type="text"
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-855 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                  placeholder="E.g. Insurance policy 2025"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">File</label>
                <input
                  ref={docFileRef}
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-neutral-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-neutral-200 file:bg-neutral-50 file:text-neutral-700 file:font-medium file:text-xs hover:file:bg-neutral-100 file:cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Expiry date (optional)</label>
                <input
                  type="date"
                  value={docExpiryDate}
                  onChange={(e) => setDocExpiryDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-850 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Notes (optional)</label>
                <textarea
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-850 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                  placeholder="Optional notes"
                />
              </div>
              <button
                type="submit"
                disabled={docSaving}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#89d957] to-[#74c346] text-white text-sm font-semibold hover:opacity-95 shadow-sm active:scale-[0.98] transition disabled:opacity-50"
              >
                {docSaving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>) : (<><Upload className="w-4 h-4" /> Upload</>)}
              </button>
            </form>
          </div>
        </div>
      )}
        </div>
      </div>
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
    unauthorized_use: 'text-red-600 bg-red-50 border-red-200',
    damage: 'text-amber-600 bg-amber-50 border-amber-200',
    missing_checkin: 'text-blue-600 bg-blue-50 border-blue-200',
    other: 'text-neutral-600 bg-neutral-50 border-neutral-200',
  };

  return (
    <div className="py-2 px-3 rounded-lg bg-white border border-neutral-200/50 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${typeColor[incident.incident_type] || typeColor.other}`}>
              {typeLabel}
            </span>
            <span className="text-[10px] text-neutral-400">
              {new Date(incident.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">{incident.description}</p>
        </div>
        {incident.image_path && !imageUrl && (
          <button type="button" onClick={loadImage} className="shrink-0 w-10 h-10 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-750 hover:border-neutral-300 transition-colors">
            {loadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {imageUrl && (
        <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="block mt-2 w-32 h-32 rounded-xl overflow-hidden border border-neutral-200 hover:border-[#89d957] transition-colors">
          <img src={imageUrl} alt="Incident" className="w-full h-full object-cover" />
        </a>
      )}
    </div>
  );
}
