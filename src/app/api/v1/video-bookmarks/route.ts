import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ bookmarks: [] })
  }

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('email', session.user.email).single()

  if (!profile?.id) return NextResponse.json({ bookmarks: [] })

  const { data } = await supabase
    .from('video_bookmarks')
    .select('id, video_url, video_title, video_thumbnail, bookmarked_at')
    .eq('user_id', profile.id)
    .order('bookmarked_at', { ascending: false })

  return NextResponse.json({ bookmarks: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true, saved: false })

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('email', session.user.email).single()

  if (!profile?.id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await req.json()
  const { video_url, video_title, video_thumbnail } = body

  await supabase.from('video_bookmarks').insert({
    user_id:         profile.id,
    video_url:       video_url ?? '',
    video_title:     video_title ?? '',
    video_thumbnail: video_thumbnail ?? '',
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true })

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('email', session.user.email).single()

  if (!profile?.id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { id } = await req.json()
  await supabase.from('video_bookmarks').delete().eq('id', id).eq('user_id', profile.id)

  return NextResponse.json({ ok: true })
}
