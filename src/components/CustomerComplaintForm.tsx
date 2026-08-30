'use client';

import { useState } from 'react';

export function CustomerComplaintForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [segment, setSegment] = useState<'personal' | 'fleet'>('personal');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, segment, title, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to submit');
        return;
      }
      setDone(true);
      setTitle('');
      setBody('');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-[#89d957]/40 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Complaint received</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Thanks — our ops team will review this and follow up at{' '}
          <span className="font-medium">{email}</span>.
        </p>
        <button
          type="button"
          className="mt-4 text-sm font-medium text-[#5a9c32] hover:underline"
          onClick={() => setDone(false)}
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm space-y-4"
    >
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Raise a complaint</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Tell us what went wrong. Rexu ops will track it until it&apos;s resolved.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-neutral-600">Name</span>
          <input
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-600">Email *</span>
          <input
            type="email"
            required
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-neutral-600">Account type</span>
        <select
          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
          value={segment}
          onChange={(e) => setSegment(e.target.value as 'personal' | 'fleet')}
        >
          <option value="personal">Personal</option>
          <option value="fleet">Fleet</option>
        </select>
      </label>

      <label className="block text-sm">
        <span className="text-neutral-600">Subject *</span>
        <input
          required
          minLength={3}
          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short summary"
        />
      </label>

      <label className="block text-sm">
        <span className="text-neutral-600">Details *</span>
        <textarea
          required
          minLength={10}
          rows={4}
          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What happened? Order / QR / payment details help."
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-[#6eb84a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5a9c32] disabled:opacity-60"
      >
        {busy ? 'Submitting…' : 'Submit complaint'}
      </button>
    </form>
  );
}
