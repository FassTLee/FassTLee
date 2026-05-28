import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (isSupabaseAdminConfigured) {
    await supabaseAdmin.from('certifications').select('id').limit(1)
  }
  return Response.json({ ok: true, time: new Date().toISOString() })
}
