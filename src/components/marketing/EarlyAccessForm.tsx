'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

type Props = {
  dark?: boolean;
  onSuccess?: () => void;
};

export function EarlyAccessForm({ dark = false, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: name.trim(),
          email: email.trim(),
          mobile: mobile.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not submit request');
      }
      setDone(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <p className={`text-sm text-center py-2 ${dark ? 'text-[#89d957]' : 'text-[#5a9c32]'}`}>
        You&apos;re on the list — we&apos;ll email you when individual accounts open.
      </p>
    );
  }

  const inputClass = dark
    ? 'w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 text-sm'
    : 'w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/30 text-sm';

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3 text-left">
      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}
      <input
        type="text"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={inputClass}
        placeholder="Your name"
      />
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
        placeholder="Email address"
      />
      <input
        type="tel"
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
        className={inputClass}
        placeholder="Mobile (optional)"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-brand text-sm font-bold text-[#1a2e0f] shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request early access'}
      </button>
    </form>
  );
}
