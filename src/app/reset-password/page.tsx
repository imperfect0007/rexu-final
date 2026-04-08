'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

function parseHashParams(hash: string) {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(h);
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    expires_in: params.get('expires_in'),
    token_type: params.get('token_type'),
    type: params.get('type'),
  };
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const searchParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  useEffect(() => {
    const init = async () => {
      setError(null);
      setSuccess(null);

      try {
        // Supabase recovery links may arrive as ?code=... (PKCE) OR in the hash with access_token/refresh_token.
        const code = searchParams.get('code');
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) {
            setError('This reset link is invalid or expired. Please request a new one.');
            setLoading(false);
            return;
          }
        } else if (typeof window !== 'undefined' && window.location.hash) {
          const h = parseHashParams(window.location.hash);
          if (h.access_token && h.refresh_token) {
            const { error: sessErr } = await supabase.auth.setSession({
              access_token: h.access_token,
              refresh_token: h.refresh_token,
            });
            if (sessErr) {
              setError('This reset link is invalid or expired. Please request a new one.');
              setLoading(false);
              return;
            }
          }
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError('This reset link is invalid or expired. Please request a new one.');
          setLoading(false);
          return;
        }

        setReady(true);
      } catch (e) {
        console.error('Reset password init error:', e);
        setError('Something went wrong. Please request a new reset link.');
      } finally {
        setLoading(false);
      }
    };

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updErr) {
        setError(updErr.message || 'Failed to reset password.');
        return;
      }

      setSuccess('Password updated. Please sign in again.');
      await supabase.auth.signOut();
      router.push('/login');
    } catch (e) {
      console.error('Reset password submit error:', e);
      setError('Failed to reset password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Choose a new password for your account."
    >
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-[#9AC57A]" />
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-red-900/30 text-red-400 text-sm font-medium border border-red-800">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl bg-[#0F3D2E]/30 text-[#9AC57A] text-sm font-medium border border-[#145A3A]">
              {success}
            </div>
          )}

          {ready && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">New password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#1E2328] text-white placeholder-zinc-500 focus:ring-2 focus:ring-[#145A3A] focus:border-[#145A3A] outline-none transition-all"
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Confirm password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#1E2328] text-white placeholder-zinc-500 focus:ring-2 focus:ring-[#145A3A] focus:border-[#145A3A] outline-none transition-all"
                  placeholder="Repeat new password"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#145A3A] text-white py-3.5 rounded-xl font-semibold hover:bg-[#1F7A5A] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Set new password'}
              </button>
            </form>
          )}
        </div>
      )}
    </AuthLayout>
  );
}

