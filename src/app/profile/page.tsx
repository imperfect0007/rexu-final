'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, User, ArrowLeft } from 'lucide-react';
import { SiteNavbar } from '@/components/marketing/SiteNavbar';

interface Profile {
  id: string;
  full_name: string;
  mobile: string;
  avatar_url?: string | null; // stored as storage path in profile-photos bucket
  date_of_birth?: string | null;
}

type PageProps = {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
};

export default function ProfilePage(props: PageProps) {
  if (props.params) React.use(props.params);
  if (props.searchParams) React.use(props.searchParams);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pwOld, setPwOld] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, mobile, avatar_url, date_of_birth')
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

      setLoading(false);
    };

    load();
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
        // Store date of birth as ISO date (yyyy-mm-dd) or null
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white bg-rexu-grid flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#89d957]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <SiteNavbar />
      <div className="flex-1 bg-white bg-rexu-grid text-neutral-900 pb-20">
      <header className="bg-white/85 backdrop-blur-md border-b border-neutral-200/50 sticky top-[72px] z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-[#89d957]/10 p-1.5 rounded-xl border border-[#89d957]/20">
              <User className="w-5 h-5 text-[#5a9c32]" />
            </div>
            <span className="font-bold text-neutral-800">Profile</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 flex justify-center">
        <section className="bg-white rounded-[24px] p-8 shadow-sm border border-neutral-200/50 max-w-xl w-full">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            Account details
          </h1>
          <p className="text-sm text-neutral-500 mb-6">
            Update your basic information used across QRgency.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-[#89d957]/10 text-[#5a9c32] text-sm font-medium border border-[#89d957]/20">
              {success}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center overflow-hidden shrink-0">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt="Profile avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold text-neutral-400">
                    {profile?.full_name?.[0] ?? 'U'}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-neutral-500">
                  Profile photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="text-xs text-neutral-550"
                />
                <p className="text-[11px] text-neutral-400">
                  For best results, use a square image.
                </p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-1.5">
                Full name
              </label>
              <input
                type="text"
                required
                value={profile?.full_name ?? ''}
                onChange={(e) => setProfile((p) => (p ? { ...p, full_name: e.target.value } : p))}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                placeholder="John Doe"
              />
            </div>

            {/* Date of birth */}
            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-1.5">
                Date of birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                This will be used to calculate your age for emergency info.
              </p>
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-1.5">
                Mobile number
              </label>
              <input
                type="tel"
                required
                value={profile?.mobile ?? ''}
                onChange={(e) => setProfile((p) => (p ? { ...p, mobile: e.target.value } : p))}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                placeholder="+91 98765 43210"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#89d957] to-[#74c346] text-white text-sm font-semibold hover:opacity-95 shadow-sm active:scale-[0.98] transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : 'Save changes'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-neutral-200">
            <h2 className="text-lg font-bold text-neutral-800">Reset password</h2>
            <p className="text-sm text-neutral-500 mt-1">
              Change your password using your old password.
            </p>

            {pwError && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-200">
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="mt-4 p-3 rounded-lg bg-[#89d957]/10 text-[#5a9c32] text-sm font-medium border border-[#89d957]/20">
                {pwSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-1.5">Old password</label>
                <input
                  type="password"
                  required
                  value={pwOld}
                  onChange={(e) => setPwOld(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                  placeholder="Enter old password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-1.5">New password</label>
                <input
                  type="password"
                  required
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-1.5">Confirm new password</label>
                <input
                  type="password"
                  required
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 focus:border-[#89d957] transition"
                  placeholder="Repeat new password"
                />
              </div>

              <button
                type="submit"
                disabled={pwSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl border border-neutral-200 bg-neutral-50 text-neutral-600 text-sm font-semibold hover:bg-neutral-100 active:scale-[0.98] transition disabled:opacity-50"
              >
                {pwSaving ? <Loader2 className="w-4 h-4 animate-spin text-neutral-600" /> : 'Update password'}
              </button>
            </form>
          </div>
        </section>
      </main>
      </div>
    </div>
  );
}

