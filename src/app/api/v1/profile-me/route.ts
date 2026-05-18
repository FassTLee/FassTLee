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
    .select('name, email, avatar_url, cert_type, selected_cert, exam_date, learning_style')
    .eq('id', userId)
    .single()

  console.log('[profile-me] data:', data, '| error:', error)

  return NextResponse.json({
    name:          data?.name           ?? null,
    email:         data?.email          ?? null,
    avatarUrl:     data?.avatar_url     ?? null,
    // cert_type(프로필 편집) 없으면 selected_cert(온보딩) fallback
    certType:      data?.cert_type ?? data?.selected_cert ?? null,
    examDate:      data?.exam_date      ?? null,
    learningStyle: data?.learning_style ?? null,
  })
}
