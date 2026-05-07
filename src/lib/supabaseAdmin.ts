import { createClient } from '@supabase/supabase-js'

// Service Role 클라이언트 — 서버(API Routes)에서만 사용할 것
// RLS를 우회하므로 절대 클라이언트 번들에 포함시키지 말 것
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
