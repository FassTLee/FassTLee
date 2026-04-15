import { createClient } from '@supabase/supabase-js'

// ================================================================
// Supabase 클라이언트
//
// ⚠️ createClient는 모듈 로드 시 즉시 실행되므로
//    env가 없는 Vercel 빌드 타임에 크래시하지 않도록
//    fallback URL/KEY를 사용합니다.
//    실제 요청은 런타임 env가 있을 때만 성공합니다.
// ================================================================

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Supabase 환경변수가 실제로 설정됐는지 확인
 * API 라우트에서 503 early-return 가드로 사용
 */
export const isSupabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
