import { createClient } from '@supabase/supabase-js';

/**
 * Browser client. It only uses the publishable anonymous key; privileged work
 * must stay in server routes or Supabase database functions.
 */
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  .replace(/\/$/, '')
  .replace(/\/rest\/v1$/, '');

export const supabase = createClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
);
