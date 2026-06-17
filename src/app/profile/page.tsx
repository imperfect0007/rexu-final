'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Loader2,
  User,
  ArrowLeft,
  Lock,
  Bell,
  Shield,
  CreditCard,
  Database,
  Key,
  CheckCircle2,
  AlertTriangle,
  Mail,
  MessageSquare,
  Phone,
  Laptop,
  Smartphone,
  Eye,
  EyeOff,
  Pencil,
  ArrowRight,
  Upload,
  Download,
  Trash2
} from 'lucide-react';
import { SiteNavbar } from '@/components/marketing/SiteNavbar';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { motion, AnimatePresence } from 'framer-motion';

interface Profile {
  id: string;
  full_name: string;
  mobile: string;
  avatar_url?: string | null; // stored as storage path in profile-photos bucket
  date_of_birth?: string | null;
  account_type?: string | null;
}

type PageProps = {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
};

export default function ProfilePage(props: PageProps) {
  if (props.params) React.use(props.params);
  if (props.searchParams) React.use(props.searchParams);

  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'billing' | 'data'>('profile');

  // Profile data state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Avatar upload state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string>('');

  // Password reset state
  const [pwOld, setPwOld] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Notification Preferences (localState simulated)
  const [prefs, setPrefs] = useState({
    emailAlerts: true,
    smsAlerts: true,
    whatsappAlerts: false,
    complianceReminders: true,
    weeklyReports: false
  });

  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, mobile, avatar_url, date_of_birth, account_type')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error(error);
          setError('Failed to load profile.');
        } else {
          if (!data) {
            // Fallback if no profile row exists yet: initialize from auth user metadata
            const fallback: Profile = {
              id: user.id,
              full_name: (user.user_metadata?.full_name as string) || '',
              mobile: (user.user_metadata?.mobile as string) || '',
              avatar_url: null,
              account_type: 'personal'
            };
            setProfile(fallback);
            setAvatarPreview(null);
          } else {
            const typed = data as Profile;
            setProfile(typed);
            if (typed.avatar_url) {
              const { data: signed } = await supabase.storage
                .from('profile-photos')
                .createSignedUrl(typed.avatar_url, 60 * 60);
              setAvatarPreview(signed?.signedUrl ?? null);
            } else {
              setAvatarPreview(null);
            }
            setDateOfBirth(typed.date_of_birth ?? '');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    let avatarPath = profile.avatar_url ?? null;

    // If a new avatar file is selected, upload it to the "profile-photos" bucket (private)
    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop() || 'jpg';
      const filePath = `${profile.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, avatarFile, {
          upsert: true,
        });

      if (uploadError) {
        console.error(uploadError);
        setError('Failed to upload profile image.');
        setSaving(false);
        return;
      }

      avatarPath = filePath;
    }

    // Normalize mobile to always include +91 prefix
    let normalizedMobile = profile.mobile.trim().replace(/\s+/g, '');
    if (!normalizedMobile.startsWith('+91')) {
      normalizedMobile = normalizedMobile.replace(/^0+/, '');
      normalizedMobile = `+91${normalizedMobile}`;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        mobile: normalizedMobile,
        avatar_url: avatarPath,
        date_of_birth: dateOfBirth || null,
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error(updateError);
      setError('Failed to update profile.');
    } else {
      setSuccess('Profile updated successfully.');
      setProfile((p) => (p ? { ...p, avatar_url: avatarPath } : p));
      if (avatarPath) {
        const { data: signed } = await supabase.storage
          .from('profile-photos')
          .createSignedUrl(avatarPath, 60 * 60);
        setAvatarPreview(signed?.signedUrl ?? null);
      }
    }

    setSaving(false);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (pwNew.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError('New password and confirm password do not match.');
      return;
    }

    setPwSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email;
      if (!email) {
        setPwError('This account does not have an email/password login.');
        return;
      }

      // Verify old password by re-authenticating.
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email,
        password: pwOld,
      });
      if (reauthErr) {
        setPwError('Old password is incorrect.');
        return;
      }

      const { error: updErr } = await supabase.auth.updateUser({ password: pwNew });
      if (updErr) {
        setPwError(updErr.message || 'Failed to update password.');
        return;
      }

      setPwSuccess('Password updated successfully.');
      setPwOld('');
      setPwNew('');
      setPwConfirm('');
    } catch (e) {
      console.error('Change password error:', e);
      setPwError('Failed to update password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setSaving(true);

      const [vehiclesRes, driversRes, docsRes, remindersRes] = await Promise.all([
        supabase.from('fleet_vehicles').select('*').eq('owner_profile_id', user.id),
        supabase.from('fleet_drivers').select('*').eq('owner_profile_id', user.id),
        supabase.from('fleet_documents').select('*').eq('owner_profile_id', user.id),
        supabase.from('fleet_maintenance_reminders').select('*').eq('owner_profile_id', user.id),
      ]);

      const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        vehicles: vehiclesRes.data || [],
        drivers: driversRes.data || [],
        documents: docsRes.data || [],
        reminders: remindersRes.data || [],
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `rexu-fleet-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccess('Fleet backup downloaded successfully.');
    } catch (err) {
      console.error('Backup error:', err);
      setError('Failed to export backup data.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.vehicles || !json.drivers) {
          setError('Invalid backup file structure.');
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        // Restore vehicles
        if (json.vehicles.length > 0) {
          const vehiclesToInsert = json.vehicles.map((v: any) => {
            const { id, created_at, ...rest } = v;
            return {
              ...rest,
              owner_profile_id: user.id
            };
          });
          const { error: vErr } = await supabase.from('fleet_vehicles').insert(vehiclesToInsert);
          if (vErr) console.error('Restore vehicles error:', vErr);
        }

        // Restore drivers
        if (json.drivers.length > 0) {
          const driversToInsert = json.drivers.map((d: any) => {
            const { id, created_at, ...rest } = d;
            return {
              ...rest,
              owner_profile_id: user.id
            };
          });
          const { error: dErr } = await supabase.from('fleet_drivers').insert(driversToInsert);
          if (dErr) console.error('Restore drivers error:', dErr);
        }

        // Restore documents
        if (json.documents && json.documents.length > 0) {
          const docsToInsert = json.documents.map((doc: any) => {
            const { id, created_at, ...rest } = doc;
            return {
              ...rest,
              owner_profile_id: user.id
            };
          });
          const { error: docErr } = await supabase.from('fleet_documents').insert(docsToInsert);
          if (docErr) console.error('Restore documents error:', docErr);
        }

        // Restore reminders
        if (json.reminders && json.reminders.length > 0) {
          const remindersToInsert = json.reminders.map((r: any) => {
            const { id, created_at, ...rest } = r;
            return {
              ...rest,
              owner_profile_id: user.id
            };
          });
          const { error: rErr } = await supabase.from('fleet_maintenance_reminders').insert(remindersToInsert);
          if (rErr) console.error('Restore reminders error:', rErr);
        }

        setSuccess('Fleet backup restored successfully! Your tables have been populated.');
      } catch (err) {
        console.error('Restore error:', err);
        setError('Failed to parse and restore backup file. Ensure it is a valid JSON backup.');
      } finally {
        setSaving(false);
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white bg-rexu-grid flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#89d957]" />
      </div>
    );
  }

  const isCommercial = profile?.account_type === 'commercial';

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <SiteNavbar title="Profile Settings" subtitle="Edit your information" backUrl="/dashboard" />
      <div className="flex-1 flex bg-white bg-rexu-grid text-neutral-900">
        <DashboardSidebar activePath="/profile" />
        <div className="flex-1 flex flex-col min-h-[calc(100vh-72px)]">
          <motion.main
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
            className="flex-1 p-8 space-y-6 bg-transparent"
          >
            {/* Header section tag */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5a9c32] bg-[#89d957]/10 w-fit px-2.5 py-1 rounded-full">
                Control Panel
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-950">Settings</h1>
              <p className="text-neutral-500 text-sm">
                Manage your profile details, notification paths, security sessions, and backups.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 text-red-700 text-sm font-semibold border border-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-4 rounded-2xl bg-[#89d957]/15 text-[#5a9c32] text-sm font-semibold border border-[#89d957]/20 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Premium Tab Bar Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
              {/* Left tab selectors */}
              <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 border-b lg:border-b-0 lg:border-r border-neutral-200 shrink-0">
                {[
                  { id: 'profile', label: 'Personal Details', icon: User },
                  { id: 'notifications', label: 'Notification Preferences', icon: Bell },
                  { id: 'security', label: 'Security & Access', icon: Shield },
                  { id: 'billing', label: 'Plan & Billing', icon: CreditCard },
                  { id: 'data', label: 'Data Management', icon: Database },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setError(null);
                        setSuccess(null);
                        setActiveTab(t.id as any);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all relative shrink-0 text-left ${
                        isActive
                          ? 'text-[#5a9c32] bg-[#89d957]/10'
                          : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="settingsActiveAccent"
                          className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full bg-[#89d957] hidden lg:block"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right content panels with animations */}
              <div className="lg:col-span-3 min-h-[400px]">
                <AnimatePresence mode="wait">
                  {activeTab === 'profile' && (
                    <motion.div
                      key="profile-tab"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.25 }}
                      className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-6"
                    >
                      <div>
                        <h2 className="text-lg font-bold text-neutral-950">Basic Details</h2>
                        <p className="text-xs text-neutral-500 mt-0.5">Primary information displayed on your emergency QR codes.</p>
                      </div>

                      <form onSubmit={handleSave} className="space-y-5">
                        {/* Avatar */}
                        <div className="flex items-center gap-5">
                          <div className="relative group">
                            <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                              {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-2xl font-bold text-neutral-400">
                                  {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                                </span>
                              )}
                            </div>
                            <label className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-[#89d957] hover:bg-[#74c346] text-white rounded-xl shadow-md border border-white cursor-pointer transition-transform hover:scale-105 active:scale-95">
                              <Pencil className="w-3.5 h-3.5" />
                              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                            </label>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-neutral-800">Profile Photo</p>
                            <p className="text-[10px] text-neutral-400 mt-0.5">JPG or PNG. Square aspect ratio works best.</p>
                          </div>
                        </div>

                        {/* Name */}
                        <div>
                          <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Full name</label>
                          <input
                            type="text"
                            required
                            value={profile?.full_name ?? ''}
                            onChange={(e) => setProfile((p) => (p ? { ...p, full_name: e.target.value } : p))}
                            className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                            placeholder="John Doe"
                          />
                        </div>

                        {/* DOB */}
                        <div>
                          <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Date of birth</label>
                          <input
                            type="date"
                            value={dateOfBirth}
                            onChange={(e) => setDateOfBirth(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                          />
                          <p className="text-[10px] text-neutral-400 mt-1">Used to calculate age details on check-in pages.</p>
                        </div>

                        {/* Mobile */}
                        <div>
                          <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Mobile number</label>
                          <input
                            type="tel"
                            required
                            value={profile?.mobile ?? ''}
                            onChange={(e) => setProfile((p) => (p ? { ...p, mobile: e.target.value } : p))}
                            className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                            placeholder="+91 98765 43210"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={saving}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#89d957] to-[#74c346] text-white text-xs font-bold hover:opacity-95 shadow-sm active:scale-[0.98] transition disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : 'Save Profile Changes'}
                        </button>
                      </form>
                    </motion.div>
                  )}

                  {activeTab === 'notifications' && (
                    <motion.div
                      key="notifications-tab"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.25 }}
                      className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-6"
                    >
                      <div>
                        <h2 className="text-lg font-bold text-neutral-950">Notification Preferences</h2>
                        <p className="text-xs text-neutral-500 mt-0.5">Configure compliance warning alerts and safety notifications.</p>
                      </div>

                      <div className="space-y-4">
                        {[
                          { key: 'emailAlerts', title: 'Email Notifications', desc: 'Receive expiration alerts and scan updates at registered email.', icon: Mail },
                          { key: 'smsAlerts', title: 'SMS Direct Alerts', desc: 'Critical check-in warnings and emergency trigger SMS.', icon: Phone },
                          { key: 'whatsappAlerts', title: 'WhatsApp Integration', desc: 'Automated document reminders directly on WhatsApp.', icon: MessageSquare },
                          { key: 'complianceReminders', title: 'Compliance Alerts', desc: 'Alert when driver VEC has elapsed or is overdue.', icon: Shield },
                        ].map((pref) => {
                          const Icon = pref.icon;
                          const checked = (prefs as any)[pref.key];
                          return (
                            <div key={pref.key} className="flex items-start justify-between p-4 rounded-2xl border border-neutral-150 hover:bg-neutral-50/30 transition-colors">
                              <div className="flex gap-3 min-w-0">
                                <div className="p-2 rounded-xl bg-[#89d957]/10 text-[#5a9c32] shrink-0">
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-neutral-900">{pref.title}</p>
                                  <p className="text-[11px] text-neutral-500 leading-normal mt-0.5">{pref.desc}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setPrefs((prev) => ({ ...prev, [pref.key]: !checked }))}
                                className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 relative shrink-0 ${
                                  checked ? 'bg-[#89d957]' : 'bg-neutral-200'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-sm ${
                                  checked ? 'translate-x-4' : 'translate-x-0'
                                }`} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'security' && (
                    <motion.div
                      key="security-tab"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6"
                    >
                      {/* Password Reset Box */}
                      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-6">
                        <div>
                          <h2 className="text-lg font-bold text-neutral-950">Update Password</h2>
                          <p className="text-xs text-neutral-500 mt-0.5">Use your current password to set a new security credential.</p>
                        </div>

                        {pwError && (
                          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-650 text-xs font-semibold">
                            {pwError}
                          </div>
                        )}
                        {pwSuccess && (
                          <div className="p-3 rounded-xl bg-[#89d957]/10 border border-[#89d957]/20 text-[#5a9c32] text-xs font-semibold">
                            {pwSuccess}
                          </div>
                        )}

                        <form onSubmit={handleChangePassword} className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Old password</label>
                            <div className="relative">
                              <input
                                type={showOldPw ? 'text' : 'password'}
                                required
                                value={pwOld}
                                onChange={(e) => setPwOld(e.target.value)}
                                className="w-full pl-4 pr-10 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                                placeholder="Enter old password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowOldPw(!showOldPw)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                              >
                                {showOldPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-neutral-600 mb-1.5">New password</label>
                            <div className="relative">
                              <input
                                type={showNewPw ? 'text' : 'password'}
                                required
                                value={pwNew}
                                onChange={(e) => setPwNew(e.target.value)}
                                className="w-full pl-4 pr-10 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                                placeholder="Min 6 characters"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPw(!showNewPw)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                              >
                                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Confirm new password</label>
                            <div className="relative">
                              <input
                                type={showConfirmPw ? 'text' : 'password'}
                                required
                                value={pwConfirm}
                                onChange={(e) => setPwConfirm(e.target.value)}
                                className="w-full pl-4 pr-10 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                                placeholder="Confirm new password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPw(!showConfirmPw)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                              >
                                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={pwSaving}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#89d957] to-[#74c346] text-white text-xs font-bold hover:opacity-95 shadow-sm active:scale-[0.98] transition disabled:opacity-50"
                          >
                            {pwSaving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : 'Update Password'}
                          </button>
                        </form>
                      </div>

                      {/* Active Sessions list */}
                      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-4">
                        <div>
                          <h2 className="text-lg font-bold text-neutral-950 font-sans">Active Sessions</h2>
                          <p className="text-xs text-neutral-500 mt-0.5">Device tokens that currently hold access to your REXU account.</p>
                        </div>
                        <div className="divide-y divide-neutral-100">
                          <div className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                                <Laptop className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-neutral-800">Chrome on Windows (Current)</p>
                                <p className="text-[10px] text-neutral-400">IP: 103.88.22.189 • Active 1 min ago</p>
                              </div>
                            </div>
                            <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">Active</span>
                          </div>
                          <div className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-neutral-100 text-neutral-500 rounded-xl">
                                <Smartphone className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-neutral-800">Safari on iPhone 15 Pro</p>
                                <p className="text-[10px] text-neutral-400">IP: 103.88.23.4 • Active 2 days ago</p>
                              </div>
                            </div>
                            <button className="text-[10px] text-red-500 font-semibold hover:underline">Revoke</button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'billing' && (
                    <motion.div
                      key="billing-tab"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6"
                    >
                      {/* Current Plan Card */}
                      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h2 className="text-lg font-bold text-neutral-950 font-sans">Active Plan</h2>
                            <p className="text-xs text-neutral-500 mt-0.5">Verify details of your current active service levels.</p>
                          </div>
                          <span className="text-[10px] bg-[#89d957]/15 border border-[#89d957]/30 text-[#5a9c32] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full">
                            {isCommercial ? 'B2B Commercial' : 'B2C Personal'}
                          </span>
                        </div>

                        <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-150 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">Plan Name</p>
                            <p className="text-sm font-bold text-neutral-800 mt-0.5">
                              {isCommercial ? 'Unlimited Fleet Manager' : 'QRgency Life Plan'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">Status</p>
                            <p className="text-sm font-bold text-[#5a9c32] mt-0.5 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#89d957]" />
                              Active (Verified)
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">Validity Period</p>
                            <p className="text-sm font-bold text-neutral-800 mt-0.5">Lifetime Subscription</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">Linked Stickers</p>
                            <p className="text-sm font-bold text-neutral-800 mt-0.5">Unlimited Active QR Codes</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-neutral-100 pt-5">
                          <span className="text-xs text-neutral-500">Need to upgrade or change payment profile?</span>
                          <button
                            onClick={() => router.push('/dashboard?pay=true')}
                            className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-gradient-brand text-[#1a2e0f] text-xs font-bold hover:opacity-95 shadow-sm active:scale-[0.98] transition cursor-pointer"
                          >
                            <span>Manage billing</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Mock Credit Card */}
                      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-4">
                        <div>
                          <h2 className="text-lg font-bold text-neutral-950 font-sans">Payment Methods</h2>
                          <p className="text-xs text-neutral-500 mt-0.5">Default card details used for premium sticker renewals.</p>
                        </div>
                        <div className="p-4 rounded-2xl border border-neutral-150 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-6 bg-gradient-to-r from-neutral-800 to-neutral-950 rounded-md border border-neutral-700 flex items-center justify-center text-[10px] text-white font-bold tracking-wider">
                              VISA
                            </div>
                            <div>
                              <p className="text-xs font-bold text-neutral-800">Visa Debit •••• 4890</p>
                              <p className="text-[10px] text-neutral-400">Expires 09/2030</p>
                            </div>
                          </div>
                          <span className="text-[10px] bg-neutral-150 text-neutral-600 font-semibold px-2 py-0.5 rounded-full">Primary</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'data' && (
                    <motion.div
                      key="data-tab"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.25 }}
                      className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-6"
                    >
                      <div>
                        <h2 className="text-lg font-bold text-neutral-950 font-sans">Data Management</h2>
                        <p className="text-xs text-neutral-500 mt-0.5">Manage data backups to locally archive and restore fleet records.</p>
                      </div>

                      {/* Backup Download */}
                      <div className="p-5 rounded-2xl border border-neutral-150 hover:border-neutral-250 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                            <Download className="w-4 h-4 text-[#5a9c32]" />
                            Download JSON Backup
                          </p>
                          <p className="text-[11px] text-neutral-500 leading-normal max-w-md">
                            Download a full archive of your fleet vehicles, registered drivers, documents, and reminders.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadBackup}
                          disabled={saving}
                          className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 text-xs font-bold hover:bg-neutral-100 transition active:scale-[0.98] disabled:opacity-50 shrink-0"
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          <span>Export Data</span>
                        </button>
                      </div>

                      {/* Backup Restore Upload */}
                      <div className="p-5 rounded-2xl border border-neutral-150 hover:border-neutral-250 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                            <Upload className="w-4 h-4 text-amber-600" />
                            Restore JSON Backup
                          </p>
                          <p className="text-[11px] text-neutral-500 leading-normal max-w-md">
                            Upload a previously exported REXU JSON file to import vehicles, drivers, and reminders.
                          </p>
                        </div>
                        <label className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition active:scale-[0.98] disabled:opacity-50 shrink-0 cursor-pointer">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Import Data</span>
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleRestoreBackup}
                            className="hidden"
                            disabled={saving}
                          />
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  );
}
