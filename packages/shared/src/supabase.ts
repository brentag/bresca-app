import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  ?? process.env.SUPABASE_URL
  ?? '';

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ?? process.env.SUPABASE_ANON_KEY
  ?? '';

// Singleton — único punto de creación del cliente en todo el monorepo
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
