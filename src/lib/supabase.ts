import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Only create the client if we have the required configuration
// If not, we'll export a null or a proxy that throws a clearer error on use
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
