import { NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/v1/oral-exam/schedule
// exam_schedules 테이블에서 가장 가까운 다음 일정 반환
// 테이블이 없거나 데이터가 없으면 nextDate: null 반환
export async function GET() {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ nextDate: null })
  }

  try {
    const now = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('exam_schedules')
      .select('exam_date, exam_name')
      .gt('exam_date', now)
      .order('exam_date', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({ nextDate: null })
    }

    const formatted = new Date(data.exam_date).toLocaleDateString('ko-KR', {
      year:  'numeric',
      month: 'long',
      day:   'numeric',
    })

    return NextResponse.json({
      nextDate: data.exam_name ? `${formatted} (${data.exam_name})` : formatted,
    })
  } catch {
    // exam_schedules 테이블 미존재 포함 모든 오류 → null 반환
    return NextResponse.json({ nextDate: null })
  }
}
