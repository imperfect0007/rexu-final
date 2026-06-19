'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { resolvePersonalQrToken } from '@/lib/resolvePersonalQrToken';
import { downloadQrEmergencyCard } from '@/lib/downloadQrCard';
import { SiteNavbar } from '@/components/marketing/SiteNavbar';
import AuthLayout from '@/components/AuthLayout';
import { QRCodeSVG } from 'qrcode.react';
import {
  Shield,
  User,
  Phone,
  Truck,
  HeartPulse,
  Plus,
  Trash2,
  Upload,
  Download,
  Loader2,
  ChevronRight,
  LogOut,
  Ruler,
  Scale,
  Activity,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Lock
} from 'lucide-react';
import { PaymentModal } from '@/components/PaymentModal';

interface Contact {
  name: string;
  relation: string;
  phone: string;
}

export default function IndividualDashboard() {
  const router = useRouter();
  
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authTab, setAuthTab] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Form State
  const [activeTab, setActiveTab] = useState<'profile' | 'vehicle' | 'contacts' | 'health'>('profile');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Profile data
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Vehicle data
  const [vehicleType, setVehicleType] = useState('Bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleOwnerName, setVehicleOwnerName] = useState('');
  const [vehicleImagePath, setVehicleImagePath] = useState<string | null>(null);
  const [vehicleImageUrl, setVehicleImageUrl] = useState<string | null>(null);
  const [vehicleFile, setVehicleFile] = useState<File | null>(null);

  // Contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContact, setNewContact] = useState<Contact>({ name: '', relation: '', phone: '' });

  // Health
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [medications, setMedications] = useState('');
  const [emergencyInstruction, setEmergencyInstruction] = useState('');

  // QR
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrDownloading, setQrDownloading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Monitor auth status
  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          await loadProfileData(user.id);
        }
      } catch (err) {
        console.error('Error checking auth state:', err);
      } finally {
        setLoading(false);
      }
    }
    void checkUser();
  }, []);

  // Fetch all personal data from database
  const loadProfileData = async (userId: string) => {
    try {
      // 1. Fetch Profile
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) throw profileErr;

      let isProfilePaid = false;
      if (profile) {
        if (profile.account_type === 'commercial') {
          router.push('/dashboard');
          return;
        }

        if (!profile.account_type) {
          await supabase
            .from('profiles')
            .update({ account_type: 'personal' })
            .eq('id', userId);
          profile.account_type = 'personal';
        }

        isProfilePaid = profile.is_paid || false;
        setIsPaid(isProfilePaid);
        setFullName(profile.full_name || '');
        setMobile(profile.mobile || '');
        setAvatarPath(profile.avatar_url || null);

        if (profile.avatar_url) {
          const { data: signed } = await supabase.storage
            .from('profile-photos')
            .createSignedUrl(profile.avatar_url, 3600);
          setAvatarUrl(signed?.signedUrl ?? null);
        }
      }

      // 2. Fetch Emergency Profile
      const { data: emp, error: empErr } = await supabase
        .from('emergency_profiles')
        .select('*')
        .eq('profile_id', userId)
        .maybeSingle();

      if (empErr) throw empErr;

      if (emp) {
        setBloodGroup(emp.blood_group || 'A+');
        
        // Parse extra details stored in emergency_instruction
        if (emp.emergency_instruction) {
          try {
            const parsed = JSON.parse(emp.emergency_instruction);
            if (parsed && parsed.isIndividualExtra) {
              setVehicleType(parsed.vehicleType || 'Bike');
              setVehicleNumber(parsed.vehicleNumber || '');
              setVehicleOwnerName(parsed.vehicleOwnerName || '');
              setVehicleImagePath(parsed.vehicleImageUrl || null);
              setHeight(parsed.height || '');
              setWeight(parsed.weight || '');
              setEmergencyInstruction(parsed.emergencyInstruction || '');

              if (parsed.vehicleImageUrl) {
                const { data: signed } = await supabase.storage
                  .from('profile-photos')
                  .createSignedUrl(parsed.vehicleImageUrl, 3600);
                setVehicleImageUrl(signed?.signedUrl ?? null);
              }
            } else {
              setEmergencyInstruction(emp.emergency_instruction || '');
            }
          } catch {
            setEmergencyInstruction(emp.emergency_instruction || '');
          }
        }
      }

      // 3. Fetch Medical Info
      const { data: med, error: medErr } = await supabase
        .from('medical_info')
        .select('*')
        .eq('profile_id', userId)
        .maybeSingle();

      if (medErr) throw medErr;
      if (med) {
        setMedications(med.medications || '');
      }

      // 4. Fetch Emergency Contacts
      const { data: contactsData, error: contactsErr } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: true });

      if (contactsErr) throw contactsErr;
      setContacts((contactsData || []).map(c => ({
        name: c.name,
        relation: c.relation,
        phone: c.phone
      })));

      // 5. Fetch or Auto-generate QR code
      if (isProfilePaid) {
        const token = await resolvePersonalQrToken(supabase, userId);
        if (token) {
          setQrToken(token);
        } else {
          // Automatically generate a token if not exists
          const buf = new Uint8Array(16);
          crypto.getRandomValues(buf);
          const newToken = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
          
          await supabase.from('profiles').update({ is_paid: true, activation_completed: true }).eq('id', userId);
          await supabase.from('qr_codes').insert({ profile_id: userId, token: newToken, is_active: true });
          setQrToken(newToken);
        }
      } else {
        setQrToken(null);
      }
    } catch (err) {
      console.error('Error loading profile data:', err);
    }
  };

  // Auth: Email/Password Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    let normalizedMobile = mobile.trim().replace(/\s+/g, '');
    if (!normalizedMobile.startsWith('+91')) {
      normalizedMobile = normalizedMobile.replace(/^0+/, '');
      normalizedMobile = `+91${normalizedMobile}`;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            mobile: normalizedMobile,
            account_type: 'personal',
          },
        },
      });

      if (error) throw error;

      if (data.user && data.user.identities?.length === 0) {
        setAuthError('An account already exists with this email. Please log in.');
      } else if (data.user) {
        setUser(data.user);
        await loadProfileData(data.user.id);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth: Email/Password Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        setUser(data.user);
        await loadProfileData(data.user.id);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Login failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth: Google Sign-in/up
  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const redirectUrl = `${window.location.origin}/individual`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || 'Google Auth failed.');
      setAuthLoading(false);
    }
  };

  // File Upload Helper
  const uploadImage = async (file: File, type: 'avatar' | 'vehicle', userId: string): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/${type}_${Date.now()}.${ext}`;
      
      const { error: uploadErr } = await supabase.storage
        .from('profile-photos')
        .upload(path, file);

      if (uploadErr) throw uploadErr;
      return path;
    } catch (err) {
      console.error(`Error uploading ${type} image:`, err);
      return null;
    }
  };

  // Emergency Contact management
  const addContact = () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) return;
    if (contacts.length >= 3) {
      window.alert('Maximum of 3 emergency contacts allowed.');
      return;
    }
    setContacts([...contacts, newContact]);
    setNewContact({ name: '', relation: '', phone: '' });
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  // Profile Save
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveStatus(null);
    setSaveError(null);

    try {
      let currentAvatarPath = avatarPath;
      let currentVehiclePath = vehicleImagePath;

      // 1. Upload Avatar
      if (avatarFile) {
        const path = await uploadImage(avatarFile, 'avatar', user.id);
        if (path) {
          currentAvatarPath = path;
          setAvatarPath(path);
          const { data: signed } = await supabase.storage
            .from('profile-photos')
            .createSignedUrl(path, 3600);
          setAvatarUrl(signed?.signedUrl ?? null);
        }
      }

      // 2. Upload Vehicle Photo
      if (vehicleFile) {
        const path = await uploadImage(vehicleFile, 'vehicle', user.id);
        if (path) {
          currentVehiclePath = path;
          setVehicleImagePath(path);
          const { data: signed } = await supabase.storage
            .from('profile-photos')
            .createSignedUrl(path, 3600);
          setVehicleImageUrl(signed?.signedUrl ?? null);
        }
      }

      // 3. Save Profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          mobile: mobile,
          avatar_url: currentAvatarPath,
          account_type: 'personal'
        })
        .eq('id', user.id);

      if (profileErr) throw profileErr;

      // 4. Save Extra info (JSON) in emergency_profiles.emergency_instruction
      const extraJson = JSON.stringify({
        isIndividualExtra: true,
        vehicleType,
        vehicleNumber: vehicleNumber.toUpperCase(),
        vehicleOwnerName,
        vehicleImageUrl: currentVehiclePath,
        height,
        weight,
        emergencyInstruction
      });

      const { error: empErr } = await supabase
        .from('emergency_profiles')
        .upsert({
          profile_id: user.id,
          blood_group: bloodGroup,
          guardian_phone: contacts[0]?.phone || mobile,
          emergency_instruction: extraJson,
          medications,
          age: null
        }, { onConflict: 'profile_id' });

      if (empErr) throw empErr;

      // 5. Save Medical Info
      const { error: medErr } = await supabase
        .from('medical_info')
        .upsert({
          profile_id: user.id,
          allergies: 'None',
          medical_conditions: 'None',
          medications
        }, { onConflict: 'profile_id' });

      if (medErr) throw medErr;

      // 6. Save Emergency Contacts
      await supabase.from('emergency_contacts').delete().eq('profile_id', user.id);
      if (contacts.length > 0) {
        const contactsToInsert = contacts.map(c => ({
          profile_id: user.id,
          name: c.name,
          relation: c.relation,
          phone: c.phone
        }));
        const { error: contactsErr } = await supabase
          .from('emergency_contacts')
          .insert(contactsToInsert);
        if (contactsErr) throw contactsErr;
      }

      setSaveStatus('Profile saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
      
      // Refresh token if needed
      await loadProfileData(user.id);

      // Open payment modal to purchase sticker and unlock QR code
      if (!isPaid) {
        setIsPaymentOpen(true);
      }
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setSaveError(err.message || 'Failed to save profile details.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setQrToken(null);
    router.push('/');
  };

  const handleDownloadQR = async () => {
    if (!qrToken) return;
    setQrDownloading(true);
    try {
      await downloadQrEmergencyCard(qrToken);
    } catch (err) {
      console.error('QR download error:', err);
      window.alert('Unable to download card. Please try again.');
    } finally {
      setQrDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white bg-rexu-grid flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#89d957]" />
      </div>
    );
  }

  // --- UNAUTHENTICATED FLOW ---
  if (!user) {
    return (
      <AuthLayout
        title="Individual Portal"
        subtitle="Secure your rides and personal profile. Your smart safety decal configuration hub."
      >
        <div className="space-y-6">
          {/* Custom signup/login tabs */}
          <div className="flex rounded-full bg-neutral-950/20 p-1 border border-white/5">
            <button
              onClick={() => {
                setAuthTab('signup');
                setAuthError(null);
              }}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                authTab === 'signup'
                  ? 'bg-gradient-brand text-[#1a2e0f] shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => {
                setAuthTab('login');
                setAuthError(null);
              }}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                authTab === 'login'
                  ? 'bg-gradient-brand text-[#1a2e0f] shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Log In
            </button>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-red-950/40 text-red-400 text-sm font-medium border border-red-800/40 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Social login */}
          <motion.button
            type="button"
            onClick={handleGoogleAuth}
            disabled={authLoading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg cursor-pointer"
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </motion.button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-sm text-zinc-500">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Form */}
          <form onSubmit={authTab === 'signup' ? handleRegister : handleLogin} className="space-y-4">
            {authTab === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#1E2328] text-white placeholder-zinc-500 focus:ring-2 focus:ring-[#145A3A] focus:border-transparent outline-none transition-all"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#1E2328] text-white placeholder-zinc-500 focus:ring-2 focus:ring-[#145A3A] focus:border-transparent outline-none transition-all"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#1E2328] text-white placeholder-zinc-500 focus:ring-2 focus:ring-[#145A3A] focus:border-transparent outline-none transition-all"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#1E2328] text-white placeholder-zinc-500 focus:ring-2 focus:ring-[#145A3A] focus:border-transparent outline-none transition-all"
                placeholder="Min 6 characters"
              />
            </div>

            <motion.button
              type="submit"
              disabled={authLoading}
              className="w-full bg-[#0A2A1F] text-white py-3.5 rounded-xl font-bold hover:bg-[#145A3A] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#0A2A1F]/20 cursor-pointer mt-6"
              whileTap={{ scale: 0.98 }}
            >
              {authLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : authTab === 'signup' ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>
        </div>
      </AuthLayout>
    );
  }

  // --- AUTHENTICATED FLOW ---
  return (
    <div className="min-h-screen flex flex-col font-sans bg-white bg-rexu-grid">
      <SiteNavbar isIndividual={true} showNotification={true} />
      
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-12">
        {/* Upper Header Welcome and Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white border border-neutral-200/50 rounded-3xl p-6 shadow-sm">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900">
              Welcome, {fullName || 'Individual Rider'}
            </h1>
            <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
              Configure your emergency dashboard, medical notes, vehicle card, and smart decals.
            </p>
          </div>
        </div>

        {saveStatus && (
          <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-semibold border border-emerald-200 mb-6 flex items-center gap-2 shadow-sm animate-pulse">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{saveStatus}</span>
          </div>
        )}

        {saveError && (
          <div className="p-4 rounded-xl bg-red-50 text-red-800 text-sm font-semibold border border-red-200 mb-6 flex items-center gap-2 shadow-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT SIDE: PREVIEW & QR */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-neutral-200/50 rounded-3xl p-6 shadow-sm text-center flex flex-col items-center">
              <h3 className="font-extrabold text-lg text-neutral-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#5a9c32]" />
                Emergency QR Decal
              </h3>

              {!isPaid ? (
                <div className="bg-neutral-50 border border-neutral-200/60 p-5 rounded-2xl shadow-inner relative mb-6 select-none pointer-events-none w-52 h-52 flex items-center justify-center overflow-hidden mx-auto">
                  <div className="blur-sm opacity-60">
                    <QRCodeSVG
                      value="https://rexu.in/locked"
                      size={170}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  {/* Locked Lock Icon Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg border border-neutral-100">
                      <Lock className="w-6 h-6 text-neutral-400" />
                    </div>
                  </div>
                </div>
              ) : qrToken ? (
                <div className="bg-neutral-50 border border-neutral-200/60 p-5 rounded-2xl shadow-inner relative group mb-6">
                  <QRCodeSVG
                    value={`${window.location.origin}/e/${qrToken}`}
                    size={180}
                    level="H"
                    includeMargin={false}
                  />
                  <div className="absolute inset-0 bg-neutral-950/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-2xl backdrop-blur-[1px]">
                    <a
                      href={`${window.location.origin}/e/${qrToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white text-neutral-950 font-bold rounded-full text-xs shadow-md flex items-center gap-1 hover:scale-105 transition-transform"
                    >
                      Test Decal Scan
                    </a>
                  </div>
                </div>
              ) : (
                <div className="h-44 w-44 rounded-2xl bg-neutral-100 flex items-center justify-center border border-dashed border-neutral-350 text-neutral-450 text-xs mb-6">
                  Generating QR...
                </div>
              )}

              <button
                onClick={handleDownloadQR}
                disabled={!isPaid || qrDownloading || !qrToken}
                className={`w-full py-3.5 rounded-full font-bold shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  !isPaid
                    ? 'bg-neutral-100 border border-neutral-250 text-neutral-400 cursor-not-allowed shadow-none'
                    : 'bg-[#89d957] text-[#1a2e0f] shadow-[#89d957]/15 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50'
                }`}
              >
                {qrDownloading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download QR Decal Card
                  </>
                )}
              </button>
            </div>

            {/* Photos Preview */}
            <div className="bg-white border border-neutral-200/50 rounded-3xl p-6 shadow-sm space-y-6">
              <h3 className="font-extrabold text-lg text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
                <User className="w-5 h-5 text-[#5a9c32]" />
                Decal Attachments
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Profile Photo Upload */}
                <div className="flex flex-col items-center">
                  <span className="text-xs text-neutral-450 font-bold uppercase mb-2">My Profile Photo</span>
                  <div className="relative group w-28 h-28 rounded-full overflow-hidden border border-neutral-200 bg-neutral-50 flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-neutral-300" />
                    )}
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer gap-1.5">
                      <Upload className="w-4 h-4" />
                      Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {avatarFile && (
                    <span className="text-[10px] text-emerald-600 font-semibold mt-1.5 truncate max-w-full">
                      ✓ Selected
                    </span>
                  )}
                </div>

                {/* Vehicle Photo Upload */}
                <div className="flex flex-col items-center">
                  <span className="text-xs text-neutral-450 font-bold uppercase mb-2">My Vehicle Photo</span>
                  <div className="relative group w-28 h-28 rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-50 flex items-center justify-center">
                    {vehicleImageUrl ? (
                      <img src={vehicleImageUrl} alt="Vehicle" className="w-full h-full object-cover" />
                    ) : (
                      <Truck className="w-10 h-10 text-neutral-300" />
                    )}
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer gap-1.5">
                      <Upload className="w-4 h-4" />
                      Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setVehicleFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {vehicleFile && (
                    <span className="text-[10px] text-emerald-600 font-semibold mt-1.5 truncate max-w-full">
                      ✓ Selected
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: CONFIGURATION FORMS */}
          <div className="lg:col-span-7 bg-white border border-neutral-200/50 rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[480px]">
            {/* Tab navigation */}
            <div className="flex border-b border-neutral-200/70 bg-neutral-50/50 p-2 gap-1 overflow-x-auto">
              {[
                { id: 'profile', label: 'Rider Profile', icon: User },
                { id: 'vehicle', label: 'Vehicle Specs', icon: Truck },
                { id: 'contacts', label: 'Emergency Contacts', icon: Phone },
                { id: 'health', label: 'Health details', icon: HeartPulse }
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-semibold rounded-2xl transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-neutral-900 border border-neutral-200 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/50'
                    }`}
                  >
                    <tab.icon className={`w-4 h-4 ${isActive ? 'text-[#5a9c32]' : 'text-neutral-400'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Forms body */}
            <div className="p-6 md:p-8 flex-1 min-h-[380px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* --- TAB 1: PROFILE --- */}
                  {activeTab === 'profile' && (
                    <div className="space-y-4">
                      <h3 className="font-extrabold text-lg text-neutral-900 mb-2">Rider Profile Info</h3>
                      
                      <div>
                        <label className="block text-xs font-bold text-neutral-450 uppercase mb-1.5">Full Name</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:ring-2 focus:ring-[#89d957]/50 focus:border-[#89d957] outline-none transition-all text-sm"
                          placeholder="Your full name"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-450 uppercase mb-1.5">Mobile Number</label>
                        <input
                          type="tel"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:ring-2 focus:ring-[#89d957]/50 focus:border-[#89d957] outline-none transition-all text-sm"
                          placeholder="Primary contact phone"
                        />
                      </div>
                    </div>
                  )}

                  {/* --- TAB 2: VEHICLE --- */}
                  {activeTab === 'vehicle' && (
                    <div className="space-y-4">
                      <h3 className="font-extrabold text-lg text-neutral-900 mb-2">Personal Vehicle specs</h3>

                      <div>
                        <label className="block text-xs font-bold text-neutral-450 uppercase mb-1.5">Vehicle Type</label>
                        <select
                          value={vehicleType}
                          onChange={(e) => setVehicleType(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:ring-2 focus:ring-[#89d957]/50 focus:border-[#89d957] outline-none transition-all text-sm"
                        >
                          <option value="Bike">Bike / Two-Wheeler</option>
                          <option value="Scooter">Scooter / Moped</option>
                          <option value="Car">Car / SUV</option>
                          <option value="LMV">Light Motor Vehicle (LMV)</option>
                          <option value="Heavy Vehicle">Heavy Vehicle</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-450 uppercase mb-1.5">Vehicle Registration Number</label>
                        <input
                          type="text"
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:ring-2 focus:ring-[#89d957]/50 focus:border-[#89d957] outline-none transition-all text-sm font-mono uppercase"
                          placeholder="e.g. MH12AB1234"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-450 uppercase mb-1.5">Vehicle Owner Name</label>
                        <input
                          type="text"
                          value={vehicleOwnerName}
                          onChange={(e) => setVehicleOwnerName(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:ring-2 focus:ring-[#89d957]/50 focus:border-[#89d957] outline-none transition-all text-sm"
                          placeholder="Full name of registered owner"
                        />
                      </div>
                    </div>
                  )}

                  {/* --- TAB 3: CONTACTS --- */}
                  {activeTab === 'contacts' && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-2">
                        <h3 className="font-extrabold text-lg text-neutral-900">Emergency Contacts</h3>
                        <span className="text-xs text-neutral-450 font-bold">({contacts.length}/3 Contacts)</span>
                      </div>

                      {/* Contact listing */}
                      <div className="space-y-2.5">
                        {contacts.length === 0 ? (
                          <div className="text-center py-6 text-neutral-400 text-xs border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                            No emergency contacts added yet. Add at least one guardian.
                          </div>
                        ) : (
                          contacts.map((contact, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border border-neutral-100 bg-neutral-50/30 rounded-2xl">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-[#89d957]/10 flex items-center justify-center text-[#5a9c32] text-xs font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-neutral-900">{contact.name}</h4>
                                  <p className="text-[11px] text-neutral-500 font-medium">
                                    {contact.relation} · <span className="font-mono">{contact.phone}</span>
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => removeContact(index)}
                                className="p-2 text-neutral-400 hover:text-red-650 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add new contact form */}
                      {contacts.length < 3 && (
                        <div className="p-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/30 space-y-3">
                          <h4 className="text-xs font-bold text-neutral-450 uppercase">Add Emergency Contact</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input
                              type="text"
                              value={newContact.name}
                              onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                              placeholder="Name"
                              className="px-3.5 py-2 rounded-xl border border-neutral-200 bg-white text-neutral-900 text-xs outline-none focus:ring-2 focus:ring-[#89d957]/40"
                            />
                            <input
                              type="text"
                              value={newContact.relation}
                              onChange={(e) => setNewContact({ ...newContact, relation: e.target.value })}
                              placeholder="Relation (e.g. Spouse)"
                              className="px-3.5 py-2 rounded-xl border border-neutral-200 bg-white text-neutral-900 text-xs outline-none focus:ring-2 focus:ring-[#89d957]/40"
                            />
                            <input
                              type="tel"
                              value={newContact.phone}
                              onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                              placeholder="Phone Number"
                              className="px-3.5 py-2 rounded-xl border border-neutral-200 bg-white text-neutral-900 text-xs outline-none focus:ring-2 focus:ring-[#89d957]/40"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={addContact}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Contact
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- TAB 4: HEALTH --- */}
                  {activeTab === 'health' && (
                    <div className="space-y-4">
                      <h3 className="font-extrabold text-lg text-neutral-900 mb-2">Health &amp; Medical Details</h3>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Blood Type select */}
                        <div>
                          <label className="block text-xs font-bold text-neutral-450 uppercase mb-1.5">Blood Type</label>
                          <select
                            value={bloodGroup}
                            onChange={(e) => setBloodGroup(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:ring-2 focus:ring-[#89d957]/50 focus:border-[#89d957] outline-none transition-all text-sm font-bold"
                          >
                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                              <option key={bg} value={bg}>{bg}</option>
                            ))}
                          </select>
                        </div>

                        {/* Height */}
                        <div>
                          <label className="block text-xs font-bold text-neutral-450 uppercase mb-1.5 flex items-center gap-1">
                            <Ruler className="w-3.5 h-3.5 text-[#5a9c32]" />
                            Height (cm)
                          </label>
                          <input
                            type="number"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:ring-2 focus:ring-[#89d957]/50 focus:border-[#89d957] outline-none transition-all text-sm"
                            placeholder="e.g. 175"
                          />
                        </div>

                        {/* Weight */}
                        <div>
                          <label className="block text-xs font-bold text-neutral-450 uppercase mb-1.5 flex items-center gap-1">
                            <Scale className="w-3.5 h-3.5 text-[#5a9c32]" />
                            Weight (kg)
                          </label>
                          <input
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:ring-2 focus:ring-[#89d957]/50 focus:border-[#89d957] outline-none transition-all text-sm"
                            placeholder="e.g. 70"
                          />
                        </div>
                      </div>

                      {/* Medications list */}
                      <div>
                        <label className="block text-xs font-bold text-neutral-450 uppercase mb-1.5 flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-red-650" />
                          Medications in Use
                        </label>
                        <input
                          type="text"
                          value={medications}
                          onChange={(e) => setMedications(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:ring-2 focus:ring-[#89d957]/50 focus:border-[#89d957] outline-none transition-all text-sm"
                          placeholder="e.g. Aspirin 75mg once daily, Insulin"
                        />
                      </div>

                      {/* Critical Emergency Instruction */}
                      <div>
                        <label className="block text-xs font-bold text-neutral-450 uppercase mb-1.5 flex items-center gap-1">
                          <HeartPulse className="w-3.5 h-3.5 text-red-650" />
                          Critical Emergency Instruction
                        </label>
                        <textarea
                          rows={3}
                          value={emergencyInstruction}
                          onChange={(e) => setEmergencyInstruction(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:ring-2 focus:ring-[#89d957]/50 focus:border-[#89d957] outline-none transition-all text-sm leading-relaxed"
                          placeholder="Enter any critical info first responders should see immediately (allergies, medical conditions, language notes, instructions)."
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

              {/* Save Action Footer */}
              <div className="border-t border-neutral-200/70 p-6 bg-neutral-50/50 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-gradient-brand text-[#1a2e0f] hover:shadow-md hover:scale-[1.01] active:scale-[0.99] font-bold text-sm transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-sm shadow-[#89d957]/15"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving Changes...
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </button>
              </div>
            </div>
        </div>
      </main>

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        userId={user?.id || ''}
        onSuccess={() => {
          setIsPaid(true);
          if (user?.id) void loadProfileData(user.id);
        }}
      />
    </div>
  );
}
