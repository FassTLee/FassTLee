import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET: 현재 유저의 신청 목록
export async function GET(_req: NextRequest) {
  if (!isSupabaseAdminConfigured) return NextResponse.json({ data: [] })
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('oral_exam_registrations')
    .select('*')
    .eq('user_id', session.user.id)
    .order('exam_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

// POST: 새 신청 등록
export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) return NextResponse.json({ error: 'not configured' }, { status: 500 })
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const { certificationId, examDate, weekNumber, slotNumber } = body

  // 중복 신청 체크
  const { data: existing } = await supabaseAdmin
    .from('oral_exam_registrations')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('week_number', weekNumber)
    .eq('slot_number', slotNumber)
    .single()

  if (existing) return NextResponse.json({ error: '이미 신청한 회차입니다' }, { status: 409 })

  // 같은 날짜 최대 ticket_number 조회
  const { data: maxRow } = await supabaseAdmin
    .from('oral_exam_registrations')
    .select('ticket_number')
    .eq('exam_date', examDate)
    .order('ticket_number', { ascending: false })
    .limit(1)
    .single()

  const ticketNumber = maxRow ? maxRow.ticket_number + 1 : 1

  // 시작 시간 계산 (9:00 + (N-1)*10분)
  const totalMinutes = 9 * 60 + (ticketNumber - 1) * 10
  const hh = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const mm = (totalMinutes % 60).toString().padStart(2, '0')
  const startTime = `${hh}:${mm}:00`

  const { data, error } = await supabaseAdmin
    .from('oral_exam_registrations')
    .insert({
      user_id:          session.user.id,
      certification_id: certificationId,
      exam_date:        examDate,
      week_number:      weekNumber,
      slot_number:      slotNumber,
      ticket_number:    ticketNumber,
      start_time:       startTime,
      is_completed:     false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
