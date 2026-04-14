import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ================================================================
// POST /api/ads/click — 광고 클릭 카운트 증가
// ================================================================

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      // Supabase 미설정 시 조용히 OK 반환 (개발 환경)
      return NextResponse.json({ ok: true })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const { error } = await supabase.rpc('increment_ad_click', { banner_id: id })

    if (error) {
      // RPC 없는 경우 직접 업데이트
      await supabase
        .from('ad_banners')
        .update({ click_count: supabase.rpc('click_count + 1' as never) })
        .eq('id', id)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // 광고 클릭 실패는 조용히 처리
  }
}
