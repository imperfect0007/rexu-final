import { createClient } from '@supabase/supabase-js';

function cleanEnv(value: string | undefined): string {
  return (value || '').replace(/\\r/g, '').replace(/\\n/g, '').trim();
}

const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const serviceRoleKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

// Centralized Supabase admin client for all backend/server logic.
// Uses the service role key and should only be used in server-side code.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

