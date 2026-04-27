/**
 * insert-all-questions.mjs
 *
 * C:\Kinepia\questions\ 의 모든 JSON 파일을 읽어
 * Supabase chapter_questions 테이블에 INSERT합니다.
 *
 * 실행: node scripts/insert-all-questions.mjs
 *
 * 처리 순서:
 *   1. subjects 테이블에서 과목명 → subject_id 매핑
 *   2. courses upsert (subject별 1개)
 *   3. 기존 chapter_questions 삭제 (재적재 시 중복 방지)
 *   4. chapters upsert
 *   5. chapter_questions INSERT (image 필드 포함)
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// ── .env.local 파싱 ───────────────────────────────────────────────
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    const v = t.slice(eq + 1).trim()
    if (!process.env[k]) process.env[k] = v
  }
}
loadEnv()

// ── 설정 ──────────────────────────────────────────────────────────
const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const QUESTIONS_DIR    = 'C:/Kinepia/questions'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === 'placeholder-service-role-key') {
  console.error('\n  ✗ SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 없습니다.\n')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const log  = (msg) => console.log(`  ✓ ${msg}`)
const warn = (msg) => console.warn(`  ⚠ ${msg}`)
const die  = (msg) => { console.error(`  ✗ ${msg}`); process.exit(1) }

// ── 1. subjects 매핑 로드 ─────────────────────────────────────────
async function loadSubjectMap() {
  const { data, error } = await supabase.from('subjects').select('id, name')
  if (error) die(`subjects 로드 실패: ${error.message}`)
  const map = {}
  for (const s of data) map[s.name] = s.id
  log(`subjects 로드 완료 (${data.length}개)`)
  return map
}

// ── 2. course upsert (subject별 1개) ─────────────────────────────
async function upsertCourse(subjectId, subjectName) {
  const { data: existing } = await supabase
    .from('courses')
    .select('id')
    .eq('subject_id', subjectId)
    .maybeSingle()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('courses')
    .insert({
      title:       subjectName,
      description: `${subjectName} 문제은행`,
      category:    'exam',
      phase:       'phase2',
      subject_id:  subjectId,
      order_index: 99,
    })
    .select('id')
    .single()

  if (error) die(`course 생성 실패 (${subjectName}): ${error.message}`)
  log(`course 생성: ${subjectName}`)
  return data.id
}

// ── 3. 기존 문제 전체 삭제 (과목 단위 재적재) ────────────────────
async function deleteExistingQuestions(courseId, subjectName) {
  // 해당 course의 chapter 목록 조회
  const { data: chapters, error: chErr } = await supabase
    .from('chapters')
    .select('id')
    .eq('course_id', courseId)

  if (chErr || !chapters?.length) return 0

  const chapterIds = chapters.map(c => c.id)

  const { count, error } = await supabase
    .from('chapter_questions')
    .delete()
    .in('chapter_id', chapterIds)
    .select('id', { count: 'exact', head: true })

  if (error) {
    warn(`기존 문제 삭제 실패 (${subjectName}): ${error.message}`)
    return 0
  }

  if (count && count > 0) log(`기존 문제 ${count}개 삭제 (${subjectName})`)
  return count ?? 0
}

// ── 4. chapter upsert ─────────────────────────────────────────────
async function upsertChapter(courseId, chapterTitle, orderIndex) {
  const { data: existing } = await supabase
    .from('chapters')
    .select('id')
    .eq('course_id', courseId)
    .eq('title', chapterTitle)
    .maybeSingle()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('chapters')
    .insert({ course_id: courseId, title: chapterTitle, order_index: orderIndex })
    .select('id')
    .single()

  if (error) die(`chapter 생성 실패 (${chapterTitle}): ${error.message}`)
  return data.id
}

// ── 5. chapter_questions batch insert ────────────────────────────
async function insertQuestions(rows) {
  if (rows.length === 0) return 0
  const { data, error } = await supabase
    .from('chapter_questions')
    .insert(rows)
    .select('id')
  if (error) {
    warn(`INSERT 오류: ${error.message}`)
    return 0
  }
  return data.length
}

// ── 메인 ──────────────────────────────────────────────────────────
async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(' Kinepia — chapter_questions 전체 적재')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'))
  if (files.length === 0) die(`JSON 파일 없음: ${QUESTIONS_DIR}`)
  console.log(`📂 JSON 파일 ${files.length}개\n`)

  const subjectMap = await loadSubjectMap()

  const report = []   // 과목별 결과 집계
  let grandTotal = 0

  for (const file of files) {
    const questions = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf-8'))
    const subjectsInFile = [...new Set(questions.map(q => q.subject))]

    console.log(`\n📄 ${file} — ${questions.length}개 문제`)

    for (const subjectName of subjectsInFile) {
      // subject_id 확인 (없으면 신규 생성)
      if (!subjectMap[subjectName]) {
        warn(`'${subjectName}' subjects 에 없음 → 신규 생성`)
        const { data: ns, error: sErr } = await supabase
          .from('subjects')
          .insert({ name: subjectName, phase: 'phase2', order_index: 99 })
          .select('id')
          .single()
        if (sErr) { warn(`subject 생성 실패: ${sErr.message}`); continue }
        subjectMap[subjectName] = ns.id
        log(`subject 신규 생성: ${subjectName}`)
      }
      const subjectId = subjectMap[subjectName]

      // course upsert
      const courseId = await upsertCourse(subjectId, subjectName)

      // 기존 문제 삭제 (재적재 중복 방지)
      await deleteExistingQuestions(courseId, subjectName)

      // 과목 문제 + 챕터 목록
      const subjectQs   = questions.filter(q => q.subject === subjectName)
      const chapterList = [...new Set(subjectQs.map(q => q.chapter))]

      log(`${subjectName}: 챕터 ${chapterList.length}개, 문제 ${subjectQs.length}개`)

      // chapter upsert
      const chapterIdMap = {}
      for (let ci = 0; ci < chapterList.length; ci++) {
        chapterIdMap[chapterList[ci]] = await upsertChapter(courseId, chapterList[ci], ci + 1)
      }

      // rows 구성 (image 필드 포함)
      const orderCounter = {}
      const rows = []

      for (const q of subjectQs) {
        const chapterId = chapterIdMap[q.chapter]
        if (!chapterId) { warn(`chapter_id 없음: ${q.chapter}`); continue }

        orderCounter[q.chapter] = (orderCounter[q.chapter] ?? 0) + 1

        rows.push({
          chapter_id:    chapterId,
          question:      q.question,
          options:       q.options,
          answer_index:  (q.answer ?? 1) - 1,      // 1-based → 0-based
          explanation:   q.explanation    ?? null,
          order_index:   orderCounter[q.chapter],
          image_url:     q.image_url      ?? null,  // 이미지 URL (없으면 null)
          image_caption: q.image_caption  ?? null,  // 이미지 설명
          image_source:  q.image_source   ?? null,  // 이미지 출처
        })
      }

      const inserted = await insertQuestions(rows)
      log(`INSERT ${inserted}개 완료`)
      grandTotal += inserted
      report.push({ subject: subjectName, inserted, total: subjectQs.length })
    }
  }

  // ── 과목별 최종 보고 ─────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(' 과목별 INSERT 결과')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  for (const r of report) {
    const bar = r.inserted === r.total ? '✅' : '⚠️'
    console.log(` ${bar}  ${r.subject.padEnd(12)}  ${r.inserted} / ${r.total}`)
  }
  console.log('───────────────────────────────────────')
  console.log(` 합계: ${grandTotal}개`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main().catch(e => { console.error(e); process.exit(1) })
