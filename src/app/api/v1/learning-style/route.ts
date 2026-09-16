import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'
import { isLearningType } from '@/lib/learning-types'
import { logUserEvent } from '@/lib/eventLog'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getUserId(token: any): string | null {
  return (token?.userId ?? token?.supabaseId ?? token?.sub) as string | null
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = getUserId(token)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ learning_style: null, style_tested_at: null })
  }
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('learning_style, style_tested_at')
    .eq('id', userId)
    .single()
  return NextResponse.json({
    learning_style:  data?.learning_style  ?? null,
    style_tested_at: data?.style_tested_at ?? null,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { learning_style, learning_style_answers, source, is_tie } = body
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = getUserId(token)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isLearningType(learning_style)) {
    return NextResponse.json({ error: 'Invalid learning_style' }, { status: 400 })
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      learning_style,
      style_tested_at:      new Date().toISOString(),
      onboarding_completed: true,
      ...(learning_style_answers ? { learning_style_answers } : {}),
    })
    .eq('id', userId)
    .select('id')

  if (error) console.error('[learning-style POST] error:', error)

  const saved = !error && (data?.length ?? 0) > 0
  if (!saved && !error) console.warn('[learning-style POST] 0 rows updated — userId:', userId)
  if (saved) {
    void logUserEvent({
      userId,
      eventType: 'learning_style_set',
      meta: {
        learning_style,
        answers_present: !!learning_style_answers,
        source: body.source ?? 'unknown',
      },
    })

    if (!['landing', 'deferred_sync', 'onboarding'].includes(source)) {
      console.warn('[learning-style POST] invalid history source — insert skipped:', source)
    } else if (Array.isArray(learning_style_answers)) {
      try {
        const { error: historyError } = await supabaseAdmin
          .from('learning_style_responses')
          .insert({
            user_id: userId,
            schema_version: 2,
            source,
            answers: learning_style_answers,
            answer_count: learning_style_answers.length,
            computed_style: learning_style,
            is_tie: typeof is_tie === 'boolean' ? is_tie : false,
          })
        if (historyError) console.error('[learning-style POST] history insert error:', historyError)
      } catch (historyError) {
        console.error('[learning-style POST] history insert exception:', historyError)
      }
    }
  }

  return NextResponse.json({ ok: true, saved })
}
