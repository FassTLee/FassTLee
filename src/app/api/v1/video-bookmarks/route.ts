import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const email = token.email as string
  if (!isSupabaseConfigured) {
    return NextResponse.json({ bookmarks: [] })
  }

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('email', email).single()

  if (!profile?.id) return NextResponse.json({ bookmarks: [] })

  const { data } = await supabase
    .from('video_bookmarks')
    .select('id, video_url, video_title, video_thumbnail, bookmarked_at')
    .eq('user_id', profile.id)
    .order('bookmarked_at', { ascending: false })

  return NextResponse.json({ bookmarks: data ?? [] })
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const email = token.email as string
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true, saved: false })

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('email', email).single()

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
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const email = token.email as string
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true })

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('email', email).single()

  if (!profile?.id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { id } = await req.json()
  await supabase.from('video_bookmarks').delete().eq('id', id).eq('user_id', profile.id)

  return NextResponse.json({ ok: true })
}
