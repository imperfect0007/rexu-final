'use client';

import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const REASONS = [
  { value: 'lost', label: 'Lost sticker' },
  { value: 'damaged', label: 'Damaged / unreadable' },
  { value: 'never_received', label: 'Never received' },
  { value: 'other', label: 'Other' },
] as const;

type Reason = (typeof REASONS)[number]['value'];

type Props = {
  segment: 'personal' | 'fleet';
  qrToken?: string | null;
  vehicleId?: string | null;
  vehicleNumber?: string | null;
  /** compact = small fleet row button */
  variant?: 'full' | 'compact';
};

export function RequestQrReplacement({
  segment,
  qrToken,
  vehicleId,
  vehicleNumber,
  variant = 'full',
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>('lost');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setError('Please sign in again.');
        return;
      }

      const res = await fetch('/api/qr-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          reason,
          note,
          segment,
          qr_token: qrToken || undefined,
          vehicle_id: vehicleId || undefined,
          vehicle_number: vehicleNumber || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to submit');
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  const btnClass =
    variant === 'compact'
      ? 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-[10px] font-semibold hover:bg-amber-100 transition'
      : 'w-full bg-white border border-neutral-200 text-neutral-700 py-3 rounded-xl font-bold hover:bg-neutral-50 transition-all flex items-center justify-center gap-2';

  return (
    <>
      <button type="button" className={btnClass} onClick={() => setOpen(true)}>
        <RefreshCw className={variant === 'compact' ? 'w-3 h-3' : 'w-4 h-4'} />
        {variant === 'compact' ? 'Request sticker' : 'Request replacement sticker'}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-neutral-100 p-5 space-y-4">
            {done ? (
              <>
                <h3 className="text-lg font-semibold text-neutral-900">Request sent</h3>
                <p className="text-sm text-neutral-600">
                  Rexu ops will reprint and ship your sticker. Track progress via support if needed.
                </p>
                <button
                  type="button"
                  className="w-full rounded-xl bg-[#89d957] text-[#1a2e0f] font-semibold py-2.5"
                  onClick={() => {
                    setOpen(false);
                    setDone(false);
                    setNote('');
                  }}
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">
                    Re-request QR sticker
                  </h3>
                  <p className="text-sm text-neutral-500 mt-1">
                    {vehicleNumber
                      ? `Vehicle ${vehicleNumber}`
                      : 'Personal emergency QR'}
                    . Ops will fulfill physical reprints from this queue.
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <label className="block text-sm">
                  <span className="text-neutral-600">Reason</span>
                  <select
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                    value={reason}
                    onChange={(e) => setReason(e.target.value as Reason)}
                  >
                    {REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="text-neutral-600">Note (optional)</span>
                  <textarea
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm min-h-[72px]"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Delivery address change, quantity, etc."
                    maxLength={500}
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-700"
                    disabled={busy}
                    onClick={() => {
                      setOpen(false);
                      setError(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl bg-[#89d957] text-[#1a2e0f] py-2.5 text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
                    disabled={busy}
                    onClick={() => void submit()}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Submit request
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
