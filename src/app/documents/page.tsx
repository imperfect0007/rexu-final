'use client';

import { useEffect, useState, useRef } from 'react';
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
  FileText,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import { motion } from 'framer-motion';

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

export default function DocumentsPage() {
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

      setDocuments((docs as FleetDocument[]) || []);
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

      setDocuments((prev) => [inserted as FleetDocument, ...prev]);

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

  const handleDownload = async (filePath: string, name: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('fleet-documents')
        .createSignedUrl(filePath, 300);

      if (error || !data?.signedUrl) {
        console.error('Download error:', error);
        return;
      }

      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Download error:', err);
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#9AC57A]" />
      </div>
    );
  }

  const expiredCount = documents.filter((d) => getExpiryStatus(d.expiry_date) === 'expired').length;
  const warningCount = documents.filter((d) => getExpiryStatus(d.expiry_date) === 'warning').length;

  const filtered = documents
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
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white leading-tight">Documents</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#B7BEC4]">
                Fleet documents &amp; expiry
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
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-white/10 rounded-[28px] bg-[#101518]/90 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#B7BEC4] mb-1">Total Documents</p>
              <p className="text-3xl font-bold text-white">{documents.length}</p>
            </div>
            <FileText className="w-6 h-6 text-[#B7BEC4]/40" />
          </div>
          <div className="border border-white/10 rounded-[28px] bg-[#101518]/90 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#B7BEC4] mb-1">Expiring Soon</p>
              <p className="text-3xl font-bold text-amber-400">{warningCount}</p>
            </div>
            <Clock className="w-6 h-6 text-amber-400/40" />
          </div>
          <div className="border border-white/10 rounded-[28px] bg-[#101518]/90 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#B7BEC4] mb-1">Expired</p>
              <p className="text-3xl font-bold text-red-400">{expiredCount}</p>
            </div>
            <AlertTriangle className="w-6 h-6 text-red-400/40" />
          </div>
        </div>

        {/* Expiry alerts */}
        {(expiredCount > 0 || warningCount > 0) && (
          <div className="rounded-[28px] bg-amber-950/30 border border-amber-500/30 p-5 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold">
              <AlertTriangle className="w-4 h-4" />
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
                      <span className="text-white/80">
                        {d.document_name}
                        {d.fleet_vehicles && (
                          <span className="text-[#B7BEC4]/60"> · {d.fleet_vehicles.vehicle_number}</span>
                        )}
                      </span>
                      <span className={status === 'expired' ? 'text-red-400 font-semibold' : 'text-amber-400 font-semibold'}>
                        {status === 'expired' ? `Expired ${Math.abs(days)} days ago` : `Expires in ${days} days`}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Document list */}
        <section className="bg-[#101518]/90 rounded-[28px] p-6 border border-white/10 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Fleet Documents</h2>
              <p className="text-sm text-[#B7BEC4] mt-0.5">Upload, track, and manage documents</p>
            </div>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#145A3A] text-white text-sm font-semibold hover:bg-[#1F7A5A] active:scale-[0.97] transition"
            >
              <Upload className="w-4 h-4" /> Upload Document
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B7BEC4]/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/50 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#B7BEC4]/60" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-3 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40"
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

          {/* List */}
          {filtered.length > 0 ? (
            <div className="rounded-xl border border-white/5 divide-y divide-white/5">
              {filtered.map((doc) => {
                const status = getExpiryStatus(doc.expiry_date);
                return (
                  <div
                    key={doc.id}
                    className="px-4 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#2B3136] border border-[#3A3F45] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-[#B7BEC4]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-sm text-white">{doc.document_name}</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#2B3136] border border-[#3A3F45] text-[#B7BEC4] uppercase tracking-wider">
                          {DOC_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type}
                        </span>
                        {status === 'valid' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#9AC57A] bg-[#0F3D2E]/30 border border-[#145A3A]/40 rounded-full px-2 py-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Valid
                          </span>
                        )}
                        {status === 'warning' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-950/30 border border-amber-500/30 rounded-full px-2 py-0.5">
                            <Clock className="w-3 h-3" /> Expiring soon
                          </span>
                        )}
                        {status === 'expired' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-950/30 border border-red-500/30 rounded-full px-2 py-0.5">
                            <AlertTriangle className="w-3 h-3" /> Expired
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#B7BEC4]">
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
                        onClick={() => handleDownload(doc.file_path, doc.document_name)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#145A3A] text-white text-[11px] font-medium hover:bg-[#1F7A5A] transition-colors"
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(doc)}
                        className="p-2 rounded-lg text-[#B7BEC4]/40 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#B7BEC4]/60 py-4 text-center">
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
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsUploadOpen(false)}
          />
          <div className="relative bg-[#1F2428] rounded-[28px] w-full max-w-lg p-6 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Upload Document</h2>
                <p className="text-xs text-[#B7BEC4]">
                  Upload insurance, RC, license, or any fleet document.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="p-2 text-[#B7BEC4] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && <div className="mb-3 text-xs text-red-400">{uploadError}</div>}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Document Type</label>
                <select
                  required
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                >
                  <option value="" disabled>Select type</option>
                  {DOC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Document Name</label>
                <input
                  type="text"
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                  placeholder="E.g. Truck Insurance Policy 2025"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-[#B7BEC4] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-[#3A3F45] file:bg-[#2B3136] file:text-white file:font-medium file:text-xs hover:file:bg-[#3A3F45] file:transition-colors file:cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Link to Vehicle</label>
                  <select
                    value={docVehicleId}
                    onChange={(e) => setDocVehicleId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                  >
                    <option value="">None</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.vehicle_number}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Link to Driver</label>
                  <select
                    value={docDriverId}
                    onChange={(e) => setDocDriverId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                  >
                    <option value="">None</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Expiry Date</label>
                <input
                  type="date"
                  value={docExpiryDate}
                  onChange={(e) => setDocExpiryDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Notes (optional)</label>
                <textarea
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                  placeholder="Any notes about this document..."
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#145A3A] text-white text-sm font-semibold hover:bg-[#1F7A5A] active:scale-[0.98] transition disabled:opacity-50"
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
  );
}
