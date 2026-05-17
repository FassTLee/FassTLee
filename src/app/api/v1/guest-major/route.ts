import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST /api/v1/guest-major — 전공/비전공 선택 저장
export async function POST(req: NextRequest) {
  const { guest_id, is_major } = await req.json()

  if (!guest_id || is_major === undefined || is_major === null || !isSupabaseConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const { error } = await supabase
    .from('guest_test_results')
    .update({ is_major })
    .eq('guest_id', guest_id)

  if (error) {
    console.error('[guest-major] error:', error)
    return NextResponse.json({ ok: true, saved: false })
  }

  return NextResponse.json({ ok: true, saved: true })
}
