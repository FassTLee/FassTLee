/**
 * KINEPIA — key_points 개조식 변환 스크립트
 * 실행: node scripts/convert-keypoints.js
 */

const TARGET   = process.env.KINEPIA_TARGET
const ENV_FILE = TARGET === 'prod' ? '.env.prod.local' : '.env.local'
require('dotenv').config({ path: ENV_FILE })
const { createClient } = require('@supabase/supabase-js')
const Anthropic = require('@anthropic-ai/sdk')

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// ── 타깃 가드 (첫 쓰기 전) ────────────────────────────────────────
const projectRef = ((SUPABASE_URL || '').match(/https?:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1] ?? '(unknown)'
console.log(`  ▸ env 파일 : ${ENV_FILE}`)
console.log(`  ▸ project  : ${projectRef}`)
console.log(`  ▸ service_role 존재: ${Boolean(SERVICE_ROLE_KEY)}`)
const argv = process.argv.slice(2)
if (argv.includes('--dry-run')) {
  console.log('  ▸ --dry-run: DB 접근 없이 종료')
  process.exit(0)
}
if (TARGET === 'prod' && !argv.includes('--confirm-prod')) {
  console.error('  ✗ prod 대상입니다. --confirm-prod 인자가 필요합니다.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function convertToKeyPoints(explanation) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: '당신은 교육 콘텐츠 전문가입니다. JSON 배열만 반환하세요. 마크다운 코드블록 없이 순수 JSON만 출력하세요.',
    messages: [{
      role: 'user',
      content: `다음 설명을 개조식 핵심 포인트 3~5개 배열로 변환하세요.

규칙:
- 조사·접속사 최소화, 핵심 단어 중심
- 명사형 종결 (~함, ~임, ~됨)
- 마침표 생략
- 한 가지 사실만 담기

설명:
${explanation}

출력 (JSON 배열만):
["포인트1", "포인트2", "포인트3"]`
    }]
  })
  const text = message.content[0].text.trim().replace(/```json|```/g, '').trim()
  return JSON.parse(text)
}

async function main() {
  console.log('🔍 oral 문제 조회 중...')

  const { data: questions, error } = await supabase
    .from('chapter_questions')
    .select('id, explanation')
    .eq('question_type', 'oral')
    .not('explanation', 'is', null)

  if (error) { console.error('❌ Supabase 오류:', error.message); process.exit(1) }

  console.log(`✅ ${questions.length}개 oral 문제 발견\n`)

  let done = 0, errors = 0
  for (const q of questions) {
    try {
      const keyPoints = await convertToKeyPoints(q.explanation)

      const { error: updateErr } = await supabase
        .from('chapter_questions')
        .update({ key_points: keyPoints })
        .eq('id', q.id)

      if (updateErr) throw new Error(updateErr.message)

      done++
      process.stdout.write(`\r[${done}/${questions.length}] ✅ ${Math.round(done/questions.length*100)}% 완료`)
    } catch (e) {
      errors++
      console.log(`\n❌ [${q.id.slice(0,8)}]: ${e.message}`)
    }
    await new Promise(r => setTimeout(r, 400))
  }

  console.log(`\n\n🎉 완료 — ${done}개 성공 / ${errors}개 실패`)
}

main().catch(console.error)
