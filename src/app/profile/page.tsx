'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, User, ArrowLeft } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  mobile: string;
  avatar_url?: string | null;
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
          setAvatarPreview(typed.avatar_url ?? null);
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

    let avatarUrl = profile.avatar_url ?? null;

    // If a new avatar file is selected, upload it to the "photo" bucket
    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop() || 'jpg';
      const filePath = `avatars/${profile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('photo')
        .upload(filePath, avatarFile, {
          upsert: true,
        });

      if (uploadError) {
        console.error(uploadError);
        setError('Failed to upload profile image.');
        setSaving(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('photo').getPublicUrl(filePath);

      avatarUrl = publicUrl;
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
        avatar_url: avatarUrl,
        // Store date of birth as ISO date (yyyy-mm-dd) or null
        date_of_birth: dateOfBirth || null,
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error(updateError);
      setError('Failed to update profile.');
    } else {
      setSuccess('Profile updated successfully.');
      setProfile((p) => (p ? { ...p, avatar_url: avatarUrl } : p));
      if (avatarUrl) {
        setAvatarPreview(avatarUrl);
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
      <div className="min-h-screen bg-gradient-to-b from-black via-[#101518] to-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#9AC57A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#101518] to-black pb-20">
      <header className="bg-[#1F2428] border-b border-[#2B3136]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-full border border-[#3A3F45] flex items-center justify-center text-zinc-500 hover:bg-[#2B3136] hover:text-white transition-colors"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-[#145A3A] p-1.5 rounded-lg">
              <User className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white">Profile</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 flex justify-center">
        <section className="bg-[#101518]/90 rounded-[28px] p-8 border border-white/10 max-w-xl w-full">
          <h1 className="text-2xl font-bold text-white mb-2">
            Account details
          </h1>
          <p className="text-sm text-[#B7BEC4] mb-6">
            Update your basic information used across QRgency.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/30 text-red-400 text-sm font-medium border border-red-900/40">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-[#0F3D2E]/30 text-[#9AC57A] text-sm font-medium border border-[#145A3A]">
              {success}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#2B3136] border border-[#3A3F45] flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt="Profile avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold text-zinc-400">
                    {profile?.full_name?.[0] ?? 'U'}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[#B7BEC4]">
                  Profile photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="text-xs text-[#B7BEC4]"
                />
                <p className="text-[11px] text-[#B7BEC4]/60">
                  For best results, use a square image.
                </p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-[#B7BEC4] mb-1.5">
                Full name
              </label>
              <input
                type="text"
                required
                value={profile?.full_name ?? ''}
                onChange={(e) => setProfile((p) => (p ? { ...p, full_name: e.target.value } : p))}
                className="w-full px-4 py-3 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-white text-sm placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                placeholder="John Doe"
              />
            </div>

            {/* Date of birth */}
            <div>
              <label className="block text-sm font-medium text-[#B7BEC4] mb-1.5">
                Date of birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
              />
              <p className="text-[11px] text-[#B7BEC4]/60 mt-1">
                This will be used to calculate your age for emergency info.
              </p>
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-sm font-medium text-[#B7BEC4] mb-1.5">
                Mobile number
              </label>
              <input
                type="tel"
                required
                value={profile?.mobile ?? ''}
                onChange={(e) => setProfile((p) => (p ? { ...p, mobile: e.target.value } : p))}
                className="w-full px-4 py-3 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-white text-sm placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                placeholder="+91 98765 43210"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#145A3A] text-white text-sm font-semibold hover:bg-[#1F7A5A] active:scale-[0.98] transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10">
            <h2 className="text-lg font-bold text-white">Reset password</h2>
            <p className="text-sm text-[#B7BEC4] mt-1">
              Change your password using your old password.
            </p>

            {pwError && (
              <div className="mt-4 p-3 rounded-lg bg-red-950/30 text-red-400 text-sm font-medium border border-red-900/40">
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="mt-4 p-3 rounded-lg bg-[#0F3D2E]/30 text-[#9AC57A] text-sm font-medium border border-[#145A3A]">
                {pwSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#B7BEC4] mb-1.5">Old password</label>
                <input
                  type="password"
                  required
                  value={pwOld}
                  onChange={(e) => setPwOld(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-white text-sm placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                  placeholder="Enter old password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#B7BEC4] mb-1.5">New password</label>
                <input
                  type="password"
                  required
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-white text-sm placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#B7BEC4] mb-1.5">Confirm new password</label>
                <input
                  type="password"
                  required
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#3A3F45] bg-[#2B3136] text-white text-sm placeholder:text-[#B7BEC4]/40 focus:outline-none focus:ring-2 focus:ring-[#145A3A]/40 focus:border-[#145A3A] transition"
                  placeholder="Repeat new password"
                />
              </div>

              <button
                type="submit"
                disabled={pwSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl border border-[#3A3F45] bg-[#2B3136] text-white text-sm font-semibold hover:bg-[#3A3F45] active:scale-[0.98] transition disabled:opacity-50"
              >
                {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update password'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

