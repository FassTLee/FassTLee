// /api/v1/e8f3a → Education progress API (난독화)
// Rate limit: 분당 60회 (middleware에서 처리)

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const DB_UNAVAILABLE = NextResponse.json(
  { error: 'Database not configured' },
  { status: 503 }
)

// GET: 학습 진도 조회
export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured) return DB_UNAVAILABLE

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const chapter = searchParams.get('c') ?? ''

  const { data, error } = await supabase
    .from('learning_progress')
    .select('chapter, section, is_skipped, completed_at')
    .eq('user_id', session.user.email)
    .eq('chapter', chapter)

  if (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST: 학습 진도 업데이트
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) return DB_UNAVAILABLE

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.chapter || !body?.section) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }

  const { error } = await supabase
    .from('learning_progress')
    .upsert({
      user_id: session.user.email,
      chapter: body.chapter,
      section: body.section,
      is_skipped: body.is_skipped ?? false,
      completed_at: new Date().toISOString(),
    })

  if (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
