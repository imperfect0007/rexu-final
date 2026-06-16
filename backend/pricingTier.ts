import { supabaseAdmin } from './supabaseAdminClient';

/**
 * Returns the current activation price in paise based on
 * how many activations have already been completed.
 *
 * Tiers:
 *   1–100 → ₹349 (34900 paise) (Inaugural offer)
 *   >100  → ₹499 (49900 paise) (Standard rate)
 */
export async function getActivationPricing(): Promise<{
  activationIndex: number;
  amountPaise: number;
  isFree: boolean;
}> {
  const { count } = await supabaseAdmin
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('is_activation', true);

  const activationIndex = (count ?? 0) + 1;

  let amountPaise: number;
  if (activationIndex <= 100) {
    amountPaise = 34900; // ₹349 inaugural rate
  } else {
    amountPaise = 49900; // ₹499 standard rate
  }

  return { activationIndex, amountPaise, isFree: amountPaise === 0 };
}
