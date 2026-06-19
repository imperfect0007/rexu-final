'use client';

import { useState } from 'react';
import { Loader2, X, Shield, CheckCircle2, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
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
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<'quote' | 'done'>('quote');

  const handleMockPayment = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Call the database RPC directly as the authenticated user.
      // complete_activation is security definer, so it will execute with superuser privileges,
      // updating profiles and generating/inserting the QR code token.
      const { error: rpcError } = await supabase.rpc('complete_activation', {
        p_profile_id: userId,
      });

      if (rpcError) {
        console.error('complete_activation RPC error:', rpcError);
        throw new Error(rpcError.message || 'Failed to activate profile');
      }

      // 2. Fetch the generated QR token from qr_codes table (which has a policy allowing user access)
      const { data: qrCodes, error: qrError } = await supabase
        .from('qr_codes')
        .select('token')
        .eq('profile_id', userId)
        .limit(1);

      if (qrError || !qrCodes || qrCodes.length === 0) {
        console.error('Failed to retrieve QR code:', qrError);
        throw new Error('Profile activated but QR code retrieval failed');
      }

      const generatedToken = qrCodes[0].token;
      setToken(generatedToken);
      setSuccess(true);
      setStep('done');
      
      // Call onSuccess after success screen delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Dummy payment error:', err);
      setError(err.message || 'Failed to complete mock payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-[28px] w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-neutral-100 text-neutral-800">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'quote' ? (
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-[#89d957]/10 rounded-2xl flex items-center justify-center mb-4 border border-[#89d957]/20">
              <Shield className="w-7 h-7 text-[#5a9c32]" />
            </div>
            
            <h2 className="text-xl font-black text-neutral-900">REXU Safety Sticker</h2>
            <p className="text-neutral-500 text-sm mt-1 max-w-xs">
              Complete mock payment to activate your emergency QR decal and unlock your profile card.
            </p>

            {/* Product Card Info */}
            <div className="w-full mt-5 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/50 text-left space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-neutral-450 uppercase tracking-wider">
                <span>Item</span>
                <span>Amount</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-neutral-900">
                <span>REXU Smart Safety Sticker</span>
                <div className="text-right">
                  <span className="text-neutral-900">₹349</span>
                  <span className="text-xs text-neutral-400 line-through ml-1.5 font-normal">₹499</span>
                </div>
              </div>
              {vehicleCount && vehicleCount > 0 && (
                <div className="text-xs text-neutral-500 pt-1 border-t border-neutral-200/50">
                  Fleet size: <span className="font-semibold">{vehicleCount}</span> vehicles
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 w-full rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200 text-left">
                {error}
              </div>
            )}

            <button
              onClick={handleMockPayment}
              disabled={loading}
              className="w-full mt-6 bg-[#89d957] text-[#1a2e0f] py-4 rounded-full font-bold shadow-sm shadow-[#89d957]/15 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#1a2e0f]" />
                  Processing payment...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Pay ₹349 (Demo Gateway)
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 border border-green-200">
              <CheckCircle2 className="w-10 h-10 text-[#5a9c32]" />
            </div>
            
            <h2 className="text-xl font-black text-neutral-900">Payment Successful</h2>
            <p className="text-neutral-500 text-sm mt-1 max-w-xs leading-relaxed">
              Your mock payment has been processed. Your safety QR decal is now activated and ready to download!
            </p>

            {token && (
              <div className="mt-4 p-3 bg-neutral-50 border border-neutral-250/60 rounded-xl w-full">
                <span className="text-[10px] text-neutral-400 font-bold uppercase block tracking-wider">Generated Token</span>
                <span className="font-mono text-xs text-neutral-700 select-all font-semibold break-all">{token}</span>
              </div>
            )}
            
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-neutral-450">
              <Loader2 className="w-4 h-4 animate-spin text-[#5a9c32]" />
              Redirecting to dashboard...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
