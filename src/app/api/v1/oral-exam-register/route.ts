import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function getISOWeek(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

// GET /api/v1/oral-exam-register — 내 신청 내역 조회 (최신순)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ registrations: [] })
  }

  const { data, error } = await supabaseAdmin
    .from('oral_exam_registrations')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ registrations: data ?? [] })
}

// POST /api/v1/oral-exam-register — 신청
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const body = (await req.json()) as { exam_date?: string }
  const { exam_date } = body

  if (!exam_date) {
    return NextResponse.json({ error: 'exam_date is required' }, { status: 400 })
  }

  // 중복 신청 확인
  const { data: existing } = await supabaseAdmin
    .from('oral_exam_registrations')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('exam_date', exam_date)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: '이미 신청한 날짜입니다' }, { status: 400 })
  }

  // 해당 날짜의 ticket_number 계산
  const { count } = await supabaseAdmin
    .from('oral_exam_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('exam_date', exam_date)

  const ticket_number = (count ?? 0) + 1

  // start_time: 09:00 + (ticket_number - 1) * 10분
  const totalMinutes = (ticket_number - 1) * 10
  const startH = Math.floor(totalMinutes / 60) + 9
  const startM = totalMinutes % 60
  const start_time = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`

  const week_number = getISOWeek(new Date(exam_date))

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('oral_exam_registrations')
    .insert({
      user_id:          session.user.id,
      exam_date,
      ticket_number,
      start_time,
      slot_number:      ticket_number,
      week_number,
      certification_id: '3cd928fe-f820-4335-adb7-25fd904c898c',
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ registration: inserted })
}
