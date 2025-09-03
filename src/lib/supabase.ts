/**
 * Supabase Configuration
 * 
 * Provides both client-side and server-side Supabase clients.
 * - Client: Used in React components for auth and real-time features
 * - Server: Used in API routes with elevated permissions
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client for browser usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Creates a server-side Supabase client with service role key
 * Used in API routes for operations requiring elevated permissions
 */
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createClient(supabaseUrl, supabaseServiceKey)
}
