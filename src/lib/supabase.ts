import { createClient } from '@supabase/supabase-js';

function cleanEnv(value: string | undefined): string {
  return (value || '').replace(/\\r/g, '').replace(/\\n/g, '').trim();
}

const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
