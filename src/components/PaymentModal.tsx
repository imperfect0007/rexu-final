'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, X, Shield, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color: string };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: () => void) => void;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
  /**
   * Optional count of vehicles for commercial / fleet accounts.
   * Used only for display; pricing is still controlled server-side.
   */
  vehicleCount?: number;
}

export function PaymentModal({
  isOpen,
  onClose,
  userId,
  onSuccess,
  vehicleCount,
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFree, setIsFree] = useState<boolean | null>(null);
  const [activationNumber, setActivationNumber] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pricePaise, setPricePaise] = useState<number | null>(null);
  const [step, setStep] = useState<'quote' | 'pay' | 'done'>('quote');

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) throw new Error('You must be logged in to activate your QR.');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !userId) return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setIsFree(null);
      setActivationNumber(null);
      setToken(null);
      setSuccess(false);
      setStep('quote');
      setPricePaise(null);

      try {
        const headers = await getAuthHeaders();

        const quoteRes = await fetch('/api/razorpay/quote', { headers });
        if (!quoteRes.ok) {
          const data = await quoteRes.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to get pricing');
        }
        const quote = await quoteRes.json();

        if (cancelled) return;

        if (quote.isFree) {
          const res = await fetch('/api/activate', {
            method: 'POST',
            headers,
            body: JSON.stringify({ userId }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Activation failed');
          if (cancelled) return;
          setIsFree(true);
          setActivationNumber(data.activationNumber ?? null);
          setToken(data.token ?? null);
          setPricePaise(data.pricePaise ?? 0);
          setSuccess(true);
          setTimeout(() => onSuccess(), 1200);
          setLoading(false);
          return;
        }

        setStep('pay');
        setPricePaise(quote.amountPaise);

        const orderRes = await fetch('/api/razorpay/create-order', {
          method: 'POST',
          headers,
          body: JSON.stringify({ amountPaise: quote.amountPaise }),
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');
        if (cancelled) return;

        const { orderId, keyId } = orderData;
        if (!keyId || !orderId) throw new Error('Invalid order response');

        setLoading(false);

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Razorpay'));
        });

        if (cancelled) return;

        const options: RazorpayOptions = {
          key: keyId,
          amount: quote.amountPaise,
          currency: 'INR',
          name: 'REXU',
          description: 'One-time QR activation',
          order_id: orderId,
          theme: { color: '#dc2626' },
          handler: async (response) => {
            if (cancelled) return;
            setLoading(true);
            setError(null);
            try {
              const verifyRes = await fetch('/api/razorpay/verify', {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment verification failed');
              if (cancelled) return;
              setIsFree(false);
              setActivationNumber(verifyData.activationNumber ?? null);
              setToken(verifyData.token ?? null);
              setPricePaise(verifyData.pricePaise ?? quote.amountPaise);
              setSuccess(true);
              setStep('done');
              setTimeout(() => onSuccess(), 1200);
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : 'Verification failed');
            } finally {
              setLoading(false);
            }
          },
          modal: {
            ondismiss: () => {
              if (!success) setLoading(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to activate QR');
        }
        setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onSuccess is intentionally omitted to prevent re-triggering
  }, [isOpen, userId, getAuthHeaders]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Activate Your QR</h2>
          <p className="text-zinc-500 text-sm mt-1">
            One-time activation:{' '}
            <span className="font-semibold text-red-600">
              first 100 free, then ₹99 / ₹199 / ₹299.
            </span>
          </p>
          {typeof vehicleCount === 'number' && (
            <p className="text-xs text-zinc-400 mt-1">
              Fleet vehicles:&nbsp;
              <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                {vehicleCount}
              </span>
            </p>
          )}
        </div>

        {loading && step === 'quote' ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-300 font-medium"
            >
              Close
            </button>
          </div>
        ) : success && isFree !== null ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
              {isFree ? 'You got it free!' : 'Payment successful'}
            </h3>
            <p className="text-zinc-500 text-sm">
              {isFree
                ? 'As an early customer, your QR has been activated at no cost.'
                : `Your payment of ₹${((pricePaise ?? 0) / 100).toFixed(0)} was successful and your QR is now active.`}
            </p>
            {activationNumber != null && (
              <p className="text-xs text-zinc-400">
                Customer #<span className="font-mono">{activationNumber}</span>
              </p>
            )}
            {token && (
              <p className="text-xs text-zinc-400">
                QR Token: <span className="font-mono break-all">{token}</span>
              </p>
            )}
          </div>
        ) : step === 'pay' && !success ? (
          <div className="text-center py-8">
            <p className="text-zinc-500 text-sm mb-2">
              Complete payment in the Razorpay window. Amount:{' '}
              <span className="font-semibold">
                ₹{((pricePaise ?? 0) / 100).toFixed(0)}
              </span>
              {typeof vehicleCount === 'number' && (
                <>
                  {' '}
                  for <span className="font-semibold">{vehicleCount}</span> vehicle
                  {vehicleCount === 1 ? '' : 's'}
                </>
              )}
            </p>
            <p className="text-xs text-zinc-400">If the window did not open, check pop-up blocking.</p>
            {loading && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Loader2 className="w-5 h-5 animate-spin text-red-600" />
                <span className="text-sm text-zinc-500">Verifying payment…</span>
              </div>
            )}
          </div>
        ) : null}

        {!error && !success && (
          <div className="mt-6 space-y-2 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
              <Shield className="w-3 h-3" />
              <span>Secure payment via Razorpay</span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              By proceeding, you agree to our{' '}
              <a href="/terms" target="_blank" className="text-zinc-300 underline underline-offset-2 hover:text-white">
                Terms
              </a>
              ,{' '}
              <a href="/privacy" target="_blank" className="text-zinc-300 underline underline-offset-2 hover:text-white">
                Privacy Policy
              </a>
              , and{' '}
              <a href="/refund" target="_blank" className="text-zinc-300 underline underline-offset-2 hover:text-white">
                Refund Policy
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
