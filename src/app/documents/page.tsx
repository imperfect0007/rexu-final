'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  FileText,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { SiteNavbar } from '@/components/marketing/SiteNavbar';
import { DashboardSidebar } from '@/components/DashboardSidebar';

interface FleetDocument {
  id: string;
  owner_profile_id: string;
  vehicle_id: string | null;
  driver_id: string | null;
  document_type: string;
  document_name: string;
  file_path: string;
  expiry_date: string | null;
  notes: string | null;
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

function getExpiryStatus(date: string | null): 'valid' | 'warning' | 'expired' | 'none' {
  if (!date) return 'none';
  const expiry = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = expiry.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return 'expired';
  if (days <= 30) return 'warning';
  return 'valid';
}

function daysUntilExpiry(date: string): number {
  const expiry = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function DocumentsPageContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<FleetDocument[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [docType, setDocType] = useState('');
  const [docName, setDocName] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docVehicleId, setDocVehicleId] = useState('');
  const [docDriverId, setDocDriverId] = useState('');
  const [docExpiryDate, setDocExpiryDate] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  useEffect(() => {
    void fetchDocuments();
  }, []);

  useEffect(() => {
    const v = searchParams.get('vehicle');
    if (!v || vehicles.length === 0) return;
    if (vehicles.some((x) => x.id === v)) setDocVehicleId(v);
  }, [searchParams, vehicles]);

  const fetchDocuments = async () => {
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

      const [{ data: docs }, { data: vehs }, { data: drvs }] = await Promise.all([
        supabase
          .from('fleet_documents')
          .select('*, fleet_vehicles(vehicle_number), fleet_drivers(name)')
          .eq('owner_profile_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('fleet_vehicles')
          .select('id, vehicle_number')
          .eq('owner_profile_id', user.id)
          .order('vehicle_number'),
        supabase
          .from('fleet_drivers')
          .select('id, name')
          .eq('owner_profile_id', user.id)
          .order('name'),
      ]);

      setDocuments(
        (docs || []).map((d: Record<string, unknown>) => ({
          ...d,
          fleet_vehicles: Array.isArray(d.fleet_vehicles)
            ? (d.fleet_vehicles[0] as { vehicle_number: string } | undefined) ?? null
            : d.fleet_vehicles ?? null,
          fleet_drivers: Array.isArray(d.fleet_drivers)
            ? (d.fleet_drivers[0] as { name: string } | undefined) ?? null
            : d.fleet_drivers ?? null,
        })) as FleetDocument[]
      );
      setVehicles(vehs || []);
      setDrivers(drvs || []);
    } catch (err) {
      console.error('Documents: fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile || !docType || !docName.trim()) return;

    setUploading(true);
    setUploadError(null);

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
        setUploadError(storageError.message);
        setUploading(false);
        return;
      }

      const { data: inserted, error: dbError } = await supabase
        .from('fleet_documents')
        .insert({
          owner_profile_id: user.id,
          document_type: docType,
          document_name: docName.trim(),
          file_path: filePath,
          vehicle_id: docVehicleId || null,
          driver_id: docDriverId || null,
          expiry_date: docExpiryDate || null,
          notes: docNotes.trim() || null,
        })
        .select('*, fleet_vehicles(vehicle_number), fleet_drivers(name)')
        .single();

      if (dbError) {
        setUploadError(dbError.message);
        setUploading(false);
        return;
      }

      const mapped: FleetDocument = {
        ...inserted,
        fleet_vehicles: Array.isArray(inserted.fleet_vehicles)
          ? inserted.fleet_vehicles[0] ?? null
          : inserted.fleet_vehicles ?? null,
        fleet_drivers: Array.isArray(inserted.fleet_drivers)
          ? inserted.fleet_drivers[0] ?? null
          : inserted.fleet_drivers ?? null,
      };
      setDocuments((prev) => [mapped, ...prev]);

      const linkedTo = docVehicleId
        ? vehicles.find((v) => v.id === docVehicleId)?.vehicle_number
        : docDriverId
          ? drivers.find((d) => d.id === docDriverId)?.name
          : null;

      await logFleetActivity({
        action: 'document_uploaded',
        entityType: 'document',
        entityId: inserted.id,
        description: `Uploaded ${DOC_TYPES.find((t) => t.value === docType)?.label || docType}: ${docName}${linkedTo ? ` for ${linkedTo}` : ''}`,
        metadata: { document_type: docType, expiry_date: docExpiryDate || null },
      });

      setDocType('');
      setDocName('');
      setDocFile(null);
      setDocVehicleId('');
      setDocDriverId('');
      setDocExpiryDate('');
      setDocNotes('');
      setIsUploadOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('Something went wrong while uploading.');
    } finally {
      setUploading(false);
    }
  };

  const handleOpen = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('fleet-documents')
        .createSignedUrl(filePath, 300);

      if (error || !data?.signedUrl) {
        window.alert('Could not open document.');
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Open error:', err);
      window.alert('Could not open document.');
    }
  };

  const handleDownload = async (filePath: string, name: string) => {
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
      console.error('Download error:', err);
      window.alert('Could not download document.');
    }
  };

  const handleDelete = async (doc: FleetDocument) => {
    if (!window.confirm(`Delete "${doc.document_name}"? This cannot be undone.`)) return;

    try {
      await supabase.storage.from('fleet-documents').remove([doc.file_path]);
      const { error } = await supabase.from('fleet_documents').delete().eq('id', doc.id);

      if (error) {
        console.error('Delete error:', error);
        return;
      }

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));

      await logFleetActivity({
        action: 'document_deleted',
        entityType: 'document',
        entityId: doc.id,
        description: `Deleted ${doc.document_type}: ${doc.document_name}`,
      });
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white bg-rexu-grid flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#89d957]" />
      </div>
    );
  }

  const expiredCount = documents.filter((d) => getExpiryStatus(d.expiry_date) === 'expired').length;
  const warningCount = documents.filter((d) => getExpiryStatus(d.expiry_date) === 'warning').length;

  const vehicleFilterId = searchParams.get('vehicle');

  const filtered = documents
    .filter((d) => !vehicleFilterId || d.vehicle_id === vehicleFilterId)
    .filter((d) => filterType === 'all' || d.document_type === filterType)
    .filter((d) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        d.document_name.toLowerCase().includes(q) ||
        d.document_type.toLowerCase().includes(q) ||
        d.fleet_vehicles?.vehicle_number?.toLowerCase().includes(q) ||
        d.fleet_drivers?.name?.toLowerCase().includes(q)
      );
    });

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <SiteNavbar title="Documents" subtitle="Fleet documents & expiry" backUrl="/dashboard" />
      <div className="flex-1 flex bg-white bg-rexu-grid text-neutral-900">
        <DashboardSidebar activePath="/documents" />
        <div className="flex-1 flex flex-col min-h-[calc(100vh-72px)]">
          <motion.main
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
            className="flex-1 p-8 space-y-6 bg-transparent"
          >
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-neutral-200/50 rounded-[24px] bg-white shadow-sm p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 mb-1">Total Documents</p>
              <p className="text-3xl font-bold text-neutral-900">{documents.length}</p>
            </div>
            <FileText className="w-6 h-6 text-neutral-300" />
          </div>
          <div className="border border-neutral-200/50 rounded-[24px] bg-white shadow-sm p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 mb-1">Expiring Soon</p>
              <p className="text-3xl font-bold text-amber-600">{warningCount}</p>
            </div>
            <Clock className="w-6 h-6 text-amber-400" />
          </div>
          <div className="border border-neutral-200/50 rounded-[24px] bg-white shadow-sm p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 mb-1">Expired</p>
              <p className="text-3xl font-bold text-red-600">{expiredCount}</p>
            </div>
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
        </div>

        {/* Expiry alerts */}
        {(expiredCount > 0 || warningCount > 0) && (
          <div className="rounded-[24px] bg-amber-50 border border-amber-200 p-5 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 text-sm font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Document Expiry Alerts
            </div>
            <div className="space-y-1">
              {documents
                .filter((d) => {
                  const s = getExpiryStatus(d.expiry_date);
                  return s === 'expired' || s === 'warning';
                })
                .map((d) => {
                  const status = getExpiryStatus(d.expiry_date);
                  const days = daysUntilExpiry(d.expiry_date!);
                  return (
                    <div key={d.id} className="flex items-center justify-between text-xs">
                      <span className="text-neutral-700">
                        {d.document_name}
                        {d.fleet_vehicles && (
                          <span className="text-neutral-400"> · {d.fleet_vehicles.vehicle_number}</span>
                        )}
                      </span>
                      <span className={status === 'expired' ? 'text-red-600 font-semibold' : 'text-amber-600 font-semibold'}>
                        {status === 'expired' ? `Expired ${Math.abs(days)} days ago` : `Expires in ${days} days`}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Document list */}
        <section className="bg-white rounded-[24px] p-6 shadow-sm border border-neutral-200/50 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-neutral-800">Fleet Documents</h2>
              <p className="text-sm text-neutral-400 mt-0.5">Upload, track, and manage documents</p>
            </div>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#89d957] to-[#74c346] text-white text-sm font-semibold hover:opacity-95 shadow-sm active:scale-[0.97] transition"
            >
              <Upload className="w-4 h-4" /> Upload Document
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30"
              >
                <option value="all">All Types</option>
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {vehicleFilterId && vehicles.find((x) => x.id === vehicleFilterId) && (
            <div className="rounded-xl border border-[#89d957]/20 bg-[#89d957]/10 px-4 py-3 text-xs text-neutral-600 flex flex-wrap items-center justify-between gap-2">
              <span>
                Filtered to vehicle{' '}
                <span className="text-neutral-800 font-semibold">
                  {vehicles.find((x) => x.id === vehicleFilterId)?.vehicle_number}
                </span>
              </span>
              <Link href="/documents" className="text-[#5a9c32] font-medium hover:underline">
                Show all documents
              </Link>
            </div>
          )}

          {/* List */}
          {filtered.length > 0 ? (
            <div className="rounded-xl border border-neutral-200/60 divide-y divide-neutral-200/60">
              {filtered.map((doc) => {
                const status = getExpiryStatus(doc.expiry_date);
                return (
                  <div
                    key={doc.id}
                    className="px-4 py-4 flex items-center gap-4 hover:bg-neutral-50/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-neutral-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-sm text-neutral-800">{doc.document_name}</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-50 border border-neutral-200 text-neutral-500 uppercase tracking-wider">
                          {DOC_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type}
                        </span>
                        {status === 'valid' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#5a9c32] bg-[#89d957]/10 border border-[#89d957]/20 rounded-full px-2 py-0.5">
                            <CheckCircle2 className="w-3 h-3 text-[#5a9c32]" /> Valid
                          </span>
                        )}
                        {status === 'warning' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            <Clock className="w-3 h-3 text-amber-500" /> Expiring soon
                          </span>
                        )}
                        {status === 'expired' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                            <AlertTriangle className="w-3 h-3 text-red-500" /> Expired
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                        {doc.fleet_vehicles && <span>Vehicle: {doc.fleet_vehicles.vehicle_number}</span>}
                        {doc.fleet_drivers && <span>Driver: {doc.fleet_drivers.name}</span>}
                        {doc.expiry_date && (
                          <span>
                            Expires: {new Date(doc.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleOpen(doc.file_path)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 text-[11px] font-medium hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(doc.file_path, doc.document_name)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#89d957] to-[#74c346] text-white text-[11px] font-medium hover:opacity-95 transition-colors shadow-sm"
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(doc)}
                        className="p-2 rounded-lg text-neutral-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-neutral-400 py-4 text-center">
              {searchQuery.trim() || filterType !== 'all'
                ? 'No documents match your filters.'
                : 'No documents uploaded yet. Click "Upload Document" to get started.'}
            </p>
          )}
        </section>
      </motion.main>

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            onClick={() => setIsUploadOpen(false)}
          />
          <div className="relative bg-white rounded-[24px] w-full max-w-lg p-6 shadow-2xl border border-neutral-200/60 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-800">Upload Document</h2>
                <p className="text-xs text-neutral-400">
                  Upload insurance, RC, license, or any fleet document.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && <div className="mb-3 text-xs text-red-500">{uploadError}</div>}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Document Type</label>
                <select
                  required
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                >
                  <option value="" disabled>Select type</option>
                  {DOC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Document Name</label>
                <input
                  type="text"
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                  placeholder="E.g. Truck Insurance Policy 2025"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-neutral-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-neutral-200 file:bg-neutral-50 file:text-neutral-700 file:font-medium file:text-xs hover:file:bg-neutral-100 file:transition-colors file:cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Link to Vehicle</label>
                  <select
                     value={docVehicleId}
                     onChange={(e) => setDocVehicleId(e.target.value)}
                     className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                  >
                    <option value="">None</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.vehicle_number}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Link to Driver</label>
                  <select
                     value={docDriverId}
                     onChange={(e) => setDocDriverId(e.target.value)}
                     className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                  >
                    <option value="">None</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Expiry Date</label>
                <input
                  type="date"
                  value={docExpiryDate}
                  onChange={(e) => setDocExpiryDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Notes (optional)</label>
                <textarea
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                  placeholder="Any notes about this document..."
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#89d957] to-[#74c346] text-white text-sm font-semibold hover:opacity-95 shadow-sm active:scale-[0.98] transition disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Upload Document
                  </>
                )}
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

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white bg-rexu-grid flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#89d957]" />
        </div>
      }
    >
      <DocumentsPageContent />
    </Suspense>
  );
}
