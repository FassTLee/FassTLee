import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, starRating, reviewText, surveyAnswers, isPublic } = await req.json()

  if (!userId || !isSupabaseAdminConfigured) {
    return NextResponse.json({ error: 'Missing required fields or server misconfigured' }, { status: 400 })
  }

  try {
    // 1. user_reviews 테이블에 INSERT
    const { error: insertError } = await supabaseAdmin
      .from('user_reviews')
      .insert({
        user_id:        userId,
        star_rating:    starRating,
        review_text:    reviewText,
        survey_answers: surveyAnswers,
        is_public:      isPublic,
        is_featured:    false,
      })

    if (insertError) throw insertError

    // 2. profiles 테이블 survey_completed 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ survey_completed: true })
      .eq('id', userId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
