import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ================================================================
// GET /api/ads/banner?position=xxx — 위치별 랜덤 배너 1개
// ================================================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const position = searchParams.get('position') ?? 'dashboard_feed'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ banner: null })
  }

  try {
    const supabase = createClient(supabaseUrl, anonKey)
    const { data, error } = await supabase
      .from('ad_banners')
      .select('id, title, image_url, link_url')
      .eq('position', position)
      .eq('is_active', true)

    if (error || !data || data.length === 0) {
      return NextResponse.json({ banner: null })
    }

    // 랜덤 1개 선택
    const banner = data[Math.floor(Math.random() * data.length)]
    return NextResponse.json({ banner }, {
      headers: { 'Cache-Control': 'no-store' }, // 광고는 캐시 안 함
    })
  } catch {
    return NextResponse.json({ banner: null })
  }
}
