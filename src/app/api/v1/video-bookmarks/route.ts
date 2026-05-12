import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ bookmarks: [] })
  }

  const userId = session.user.id  // Supabase UUID → 중간 profiles 조회 불필요

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ bookmarks: [] })
  }

  const { data } = await supabaseAdmin
    .from('video_bookmarks')
    .select('id, video_url, video_title, video_thumbnail, bookmarked_at')
    .eq('user_id', userId)
    .order('bookmarked_at', { ascending: false })

  return NextResponse.json({ bookmarks: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id  // Supabase UUID

  if (!isSupabaseAdminConfigured) return NextResponse.json({ ok: true, saved: false })

  const body = await req.json()
  const { video_url, video_title, video_thumbnail } = body

  await supabaseAdmin.from('video_bookmarks').insert({
    user_id:         userId,
    video_url:       video_url       ?? '',
    video_title:     video_title     ?? '',
    video_thumbnail: video_thumbnail ?? '',
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id  // Supabase UUID

  if (!isSupabaseAdminConfigured) return NextResponse.json({ ok: true })

  const { id } = await req.json()
  await supabaseAdmin.from('video_bookmarks').delete().eq('id', id).eq('user_id', userId)

  return NextResponse.json({ ok: true })
}
