import { supabaseAdmin } from './supabaseAdminClient';

/**
 * Returns the current activation price in paise based on
 * how many activations have already been completed.
 *
 * Tiers:
 *   1–100   → free (0 paise)
 *   101–500 → ₹99  (9900 paise)
 *   501–1000 → ₹199 (19900 paise)
 *   >1000   → ₹299 (29900 paise)
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
    amountPaise = 0;
  } else if (activationIndex <= 500) {
    amountPaise = 9900;
  } else if (activationIndex <= 1000) {
    amountPaise = 19900;
  } else {
    amountPaise = 29900;
  }

  return { activationIndex, amountPaise, isFree: amountPaise === 0 };
}
