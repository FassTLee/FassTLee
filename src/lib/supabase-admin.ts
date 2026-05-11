/**
 * Server-only Supabase client using the service role key.
 * Bypasses RLS — use ONLY in Next.js API routes (server-side), never in client components.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? 'https://placeholder.supabase.co'
const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY     ?? ''

export const isSupabaseAdminConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession:   false,
  },
})
