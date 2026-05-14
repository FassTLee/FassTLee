import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id

  console.log('[profile-me] userId:', userId)

  if (!userId) {
    return NextResponse.json({ name: null, email: null })
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ name: null, email: null })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('name, email, avatar_url, cert_type, exam_date')
    .eq('id', userId)
    .single()

  console.log('[profile-me] data:', data, '| error:', error)

  return NextResponse.json({
    name:       data?.name       ?? null,
    email:      data?.email      ?? null,
    avatarUrl:  data?.avatar_url ?? null,
    certType:   data?.cert_type  ?? null,
    examDate:   data?.exam_date  ?? null,
  })
}
