import { createClient } from '@supabase/supabase-js';

// Trim — Vercel/env paste sometimes leaves trailing \r\n which breaks auth.
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

// Centralized Supabase admin client for all backend/server logic.
// Uses the service role key and should only be used in server-side code.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

