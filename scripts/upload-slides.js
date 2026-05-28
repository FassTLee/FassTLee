// scripts/upload-slides.js
// 실행: node scripts/upload-slides.js
//
// 환경변수 필요:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// 필요 패키지: @supabase/supabase-js, dotenv
//   npm install @supabase/supabase-js dotenv  (이미 설치됐으면 생략)

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// ── 설정 ──────────────────────────────────────────────────────────
const BUCKET      = 'content-images'
const FOLDER      = 'slides/sport_instructor_2/practical'
const IMAGE_DIR   = 'C:\\Kinepia\\assets\\slides\\sport_instructor_2\\practical'
const TOTAL       = 191
const CONCURRENCY = 5   // 동시 업로드 수 (429 방지)

// ── Supabase Admin 클라이언트 ──────────────────────────────────────
const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

// ── 버킷 확인 / 생성 ──────────────────────────────────────────────
async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw new Error(`버킷 목록 조회 실패: ${error.message}`)

  const exists = buckets.some((b) => b.name === BUCKET)
  if (!exists) {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
    })
    if (createErr) throw new Error(`버킷 생성 실패: ${createErr.message}`)
    console.log(`✅ 버킷 '${BUCKET}' 생성 완료`)
  } else {
    console.log(`ℹ️  버킷 '${BUCKET}' 이미 존재`)
  }
}

// ── 파일명 생성 ────────────────────────────────────────────────────
function fileName(n) {
  return `slide-${String(n).padStart(3, '0')}.jpg`
}

// ── 단일 파일 업로드 ──────────────────────────────────────────────
async function uploadOne(n) {
  const name       = fileName(n)
  const localPath  = path.join(IMAGE_DIR, name)
  const storagePath = `${FOLDER}/${name}`

  if (!fs.existsSync(localPath)) {
    console.warn(`⚠️  [${name}] 파일 없음 — 건너뜀`)
    return { name, ok: false, reason: 'file not found' }
  }

  const buffer = fs.readFileSync(localPath)

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'image/jpeg',
      upsert: true,   // 이미 있으면 덮어쓰기
    })

  if (error) {
    console.error(`❌ [${name}] 업로드 실패: ${error.message}`)
    return { name, ok: false, reason: error.message }
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath)

  const publicUrl = urlData.publicUrl
  console.log(`✅ [${name}] ${publicUrl}`)
  return { name, ok: true, publicUrl }
}

// ── 동시 업로드 제어 (concurrency 제한) ──────────────────────────
async function uploadAll() {
  const results = []
  const indices = Array.from({ length: TOTAL }, (_, i) => i + 1)

  for (let i = 0; i < indices.length; i += CONCURRENCY) {
    const batch = indices.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(uploadOne))
    results.push(...batchResults)
    console.log(`--- ${Math.min(i + CONCURRENCY, TOTAL)} / ${TOTAL} 처리 완료 ---`)
  }

  return results
}

// ── 메인 ──────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 슬라이드 업로드 시작 (총 ${TOTAL}장)\n`)

  await ensureBucket()
  console.log()

  const results  = await uploadAll()
  const success  = results.filter((r) => r.ok)
  const failed   = results.filter((r) => !r.ok)

  console.log('\n══════════════════════════════════════')
  console.log(`완료: ${success.length}장 성공 / ${failed.length}장 실패`)

  if (failed.length > 0) {
    console.log('\n실패 목록:')
    failed.forEach((r) => console.log(`  - ${r.name}: ${r.reason}`))
  }

  console.log('\n✅ 업로드 완료\n')
}

main().catch((err) => {
  console.error('❌ 스크립트 오류:', err)
  process.exit(1)
})
