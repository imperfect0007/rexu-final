'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  Loader2,
  Truck,
  LogIn,
  LogOut,
  Camera,
  X,
  CheckCircle2,
  Tag,
  ArrowLeft,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface VehicleInfo {
  id: string;
  vehicle_number: string;
  label: string | null;
  make_model: string | null;
}

interface DriverInfo {
  id: string;
  name: string;
}

const FUEL_LEVELS = ['Full', '3/4', '1/2', '1/4', 'Empty'];
const TRIP_PURPOSES = ['Delivery', 'Personal Use', 'Maintenance', 'Other'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

async function compressImageTo2MB(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= MAX_IMAGE_BYTES) return file;

  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to load image'));
      el.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    const maxDim = 1920;
    const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.round(img.width * ratio));
    canvas.height = Math.max(1, Math.round(img.height * ratio));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    let quality = 0.9;
    let outBlob: Blob | null = null;
    for (let i = 0; i < 8; i += 1) {
      outBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality)
      );
      if (outBlob && outBlob.size <= MAX_IMAGE_BYTES) break;
      quality -= 0.1;
      if (quality < 0.2) quality = 0.2;
    }

    if (!outBlob) return file;
    if (outBlob.size > MAX_IMAGE_BYTES) return file;

    const nextName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([outBlob], nextName, { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export default function VehicleCheckinPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [submittedCheckType, setSubmittedCheckType] = useState<'check_in' | 'check_out'>('check_in');

  const [checkType, setCheckType] = useState<'check_in' | 'check_out'>('check_in');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [odometer, setOdometer] = useState('');
  const [fuelLevel, setFuelLevel] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');
  const [tripPurpose, setTripPurpose] = useState('');
  const [tripNote, setTripNote] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void init();
  }, []);

  const init = async () => {
    const res = await fetch(`/api/fleet/vehicle-checkin?token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setVehicle(data.vehicle);
    setDrivers(data.drivers || []);
    setLoading(false);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const optimized = await Promise.all(files.map((f) => compressImageTo2MB(f)));
    setPhotos((prev) => [...prev, ...optimized]);
    setPhotoPreviews((prev) => [...prev, ...optimized.map((f) => URL.createObjectURL(f))]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('check_type', checkType);
      if (selectedDriver) formData.append('driver_id', selectedDriver);
      if (odometer) formData.append('odometer', odometer);
      if (fuelLevel) formData.append('fuel_level', fuelLevel);
      if (conditionNotes.trim()) formData.append('condition_notes', conditionNotes.trim());
      if (tripPurpose) formData.append('trip_purpose', tripPurpose);
      if (tripPurpose === 'Other' && tripNote.trim()) formData.append('trip_note', tripNote.trim());
      for (const photo of photos) {
        formData.append('photos', photo);
      }

      const res = await fetch('/api/fleet/vehicle-checkin', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        setSubmitError(result.error || 'Failed to submit.');
        return;
      }

      setSubmittedCheckType(checkType);
      setSubmitSuccess(true);
      setCheckType('check_in');
      setSelectedDriver('');
      setOdometer('');
      setFuelLevel('');
      setConditionNotes('');
      setTripPurpose('');
      setTripNote('');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#9AC57A]" />
      </div>
    );
  }

  if (notFound || !vehicle) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <Truck className="w-12 h-12 text-[#B7BEC4]/30 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Vehicle Not Found</h1>
          <p className="text-sm text-[#B7BEC4]">This check-in QR code is invalid or expired.</p>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#0F3D2E]/30 border border-[#145A3A]/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-[#9AC57A]" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            {submittedCheckType === 'check_in' ? 'Checked In' : 'Checked Out'} Successfully
          </h1>
          <p className="text-sm text-[#B7BEC4] mb-6">Vehicle: {vehicle.vehicle_number}</p>
          <button type="button" onClick={() => setSubmitSuccess(false)} className="px-6 py-2.5 rounded-xl bg-[#145A3A] text-white text-sm font-semibold hover:bg-[#1F7A5A] transition-colors">
            Record Another
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#101518] to-black text-white pb-20">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1] as [number, number, number, number] }}
        className="bg-[#1F2428] border-b border-[#2B3136] sticky top-0 z-10"
      >
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center gap-3">
          <a href="/" className="w-9 h-9 rounded-full border border-[#3A3F45] flex items-center justify-center text-[#B7BEC4] hover:bg-[#2B3136] hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div className="bg-[#145A3A] p-1.5 rounded-full">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-sm">{vehicle.vehicle_number}</span>
            {vehicle.make_model && <span className="text-xs text-[#B7BEC4] ml-2">{vehicle.make_model}</span>}
          </div>
        </div>
      </motion.header>

      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }} className="max-w-lg mx-auto px-4 py-8 space-y-5">
        <div className="rounded-xl bg-[#0F3D2E]/20 border border-[#145A3A]/30 p-4 text-xs text-[#B7BEC4]">
          Scan this QR from your fleet. Add photos and submit check-in or check-out — no sign-in required.
        </div>

        {submitError && (
          <div className="p-3 rounded-xl bg-red-900/30 text-red-400 text-xs font-medium border border-red-800">{submitError}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Check type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-[#3A3F45]">
            <button type="button" onClick={() => setCheckType('check_in')} className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${checkType === 'check_in' ? 'bg-[#145A3A] text-white' : 'bg-[#2B3136] text-[#B7BEC4] hover:bg-[#3A3F45]'}`}>
              <LogIn className="w-4 h-4" /> Check In
            </button>
            <button type="button" onClick={() => setCheckType('check_out')} className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${checkType === 'check_out' ? 'bg-amber-600 text-white' : 'bg-[#2B3136] text-[#B7BEC4] hover:bg-[#3A3F45]'}`}>
              <LogOut className="w-4 h-4" /> Check Out
            </button>
          </div>

          {/* Driver */}
          {drivers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Driver</label>
              <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition">
                <option value="">Select driver</option>
                {drivers.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Odometer (km)</label>
              <input type="number" value={odometer} onChange={(e) => setOdometer(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition" placeholder="45230" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Fuel Level</label>
              <select value={fuelLevel} onChange={(e) => setFuelLevel(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition">
                <option value="">Select</option>
                {FUEL_LEVELS.map((f) => (<option key={f} value={f}>{f}</option>))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Condition Notes</label>
            <textarea value={conditionNotes} onChange={(e) => setConditionNotes(e.target.value)} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition" placeholder="Scratches, dents, lights status..." />
          </div>

          {/* Trip purpose */}
          <div>
            <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">
              <span className="flex items-center gap-1.5"><Tag className="w-3 h-3" /> Trip Purpose</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {TRIP_PURPOSES.map((p) => (
                <button key={p} type="button" onClick={() => { setTripPurpose(tripPurpose === p ? '' : p); if (p !== 'Other') setTripNote(''); }} className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${tripPurpose === p ? 'bg-[#145A3A] border-[#145A3A] text-white' : 'bg-[#2B3136] border-[#3A3F45] text-[#B7BEC4] hover:bg-[#3A3F45] hover:text-white'}`}>
                  {p}
                </button>
              ))}
            </div>
            {tripPurpose === 'Other' && (
              <input type="text" value={tripNote} onChange={(e) => setTripNote(e.target.value)} maxLength={120} className="w-full mt-2 px-4 py-2.5 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-sm text-white placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition" placeholder="Describe the trip purpose..." />
            )}
          </div>

          {/* Photos */}
          <div>
            <label className="block text-xs font-medium text-[#B7BEC4] mb-1.5">Photos</label>
            <div className="flex flex-wrap gap-3">
              {photoPreviews.map((preview, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#3A3F45]">
                  <img src={preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-xl border-2 border-dashed border-[#3A3F45] flex flex-col items-center justify-center gap-1 text-[#B7BEC4]/60 hover:text-[#B7BEC4] hover:border-[#B7BEC4]/40 transition-colors">
                <Camera className="w-5 h-5" />
                <span className="text-[9px] uppercase tracking-wider font-semibold">Add</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>

          <button type="submit" disabled={submitting} className={`w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-semibold active:scale-[0.98] transition disabled:opacity-50 ${checkType === 'check_in' ? 'bg-[#145A3A] hover:bg-[#1F7A5A]' : 'bg-amber-600 hover:bg-amber-700'}`}>
            {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>) : checkType === 'check_in' ? (<><LogIn className="w-4 h-4" /> Check In</>) : (<><LogOut className="w-4 h-4" /> Check Out</>)}
          </button>
        </form>
      </motion.main>
    </div>
  );
}
