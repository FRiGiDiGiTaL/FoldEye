// lib/supabase.ts - Simplified for basic paywall
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Admin client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Client for browser operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simple types for your paywall
export interface Profile {
  id: string;
  email: string;
  created_at: string;
}

export interface Purchase {
  id: string;
  profile_id: string;
  stripe_session_id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'failed';
  created_at: string;
}

// Check if user has paid
export async function checkUserAccess(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('purchases')
      .select(`
        id,
        users!inner(email)
      `)
      .eq('users.email', email)
      .eq('status', 'paid')
      .limit(1);

    if (error) {
      console.error('Error checking user access:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking user access:', error);
    return false;
  }
}