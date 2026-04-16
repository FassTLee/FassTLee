import { NextResponse } from 'next/server'

// ================================================================
// GET /api/schema — DB 스키마 메타 정보 반환 (개발/문서 목적)
// ================================================================

const SCHEMA_META = {
  version: '2.0.0',
  updated: '2026-04-14',
  app: 'Kinepia',
  tables: [
    // ─── 기존 테이블 ────────────────────────────────────────────
    {
      name: 'profiles',
      phase: 'mvp',
      description: '사용자 프로필 (Google OAuth 연동)',
      columns: ['id', 'email', 'name', 'avatar_url', 'role', 'created_at'],
      rls: 'self-only',
    },
    {
      name: 'learning_progress',
      phase: 'mvp',
      description: '레슨별 학습 진도',
      columns: ['id', 'user_id', 'chapter', 'section', 'is_skipped', 'completed_at', 'created_at'],
      rls: 'self-only',
    },
    {
      name: 'test_results',
      phase: 'mvp',
      description: '챕터별 테스트 결과',
      columns: ['id', 'user_id', 'chapter', 'score', 'total', 'type_scores_json', 'weak_muscles', 'created_at'],
      rls: 'self-only',
    },
    // ─── 게이미피케이션 ──────────────────────────────────────────
    {
      name: 'user_gamification',
      phase: 'mvp',
      description: 'XP, 레벨, 스트릭 현황',
      columns: ['id', 'user_id', 'xp', 'level', 'streak_days', 'last_study_date', 'created_at', 'updated_at'],
      rls: 'self-only',
    },
    {
      name: 'user_badges',
      phase: 'mvp',
      description: '획득한 배지 목록',
      columns: ['id', 'user_id', 'badge_type', 'badge_name', 'earned_at'],
      rls: 'self-only',
    },
    {
      name: 'leaderboard',
      phase: 'mvp',
      description: '주간/월간 XP 순위',
      columns: ['id', 'user_id', 'weekly_xp', 'monthly_xp', 'rank', 'updated_at'],
      rls: 'select-public, write-self',
    },
    // ─── Education 콘텐츠 ────────────────────────────────────────
    {
      name: 'subjects',
      phase: 'mvp',
      description: '과목 마스터 (무한 확장 구조)',
      columns: ['id', 'name', 'description', 'icon', 'phase', 'order_index', 'is_active', 'created_at'],
      rls: 'select-all',
      seed_count: 16,
    },
    {
      name: 'courses',
      phase: 'mvp',
      description: '강의 단위 (subject_id FK)',
      columns: ['id', 'title', 'description', 'category', 'subject_id', 'phase', 'level', 'xp_reward', 'order_index', 'is_locked', 'unlock_condition', 'thumbnail_url', 'created_at'],
      rls: 'select-all',
      seed_count: 9,
    },
    {
      name: 'lessons',
      phase: 'mvp',
      description: '레슨 단위 (course_id FK)',
      columns: ['id', 'course_id', 'title', 'content_json', 'lesson_type', 'xp_reward', 'order_index', 'duration_minutes', 'is_required', 'created_at'],
      rls: 'select-all',
    },
    {
      name: 'landing_test_sessions',
      phase: 'mvp',
      description: '랜딩 5문제 테스트 세션',
      columns: ['id', 'google_user_id', 'email', 'name', 'avatar_url', 'score', 'total_questions', 'weak_areas', 'answers_json', 'app_download_clicked', 'ip_address', 'created_at'],
      rls: 'insert-public, select-self',
    },
    // ─── 수입원 ──────────────────────────────────────────────────
    {
      name: 'subscription_plans',
      phase: 'mvp',
      description: '구독 플랜 (free/pro/premium)',
      columns: ['id', 'name', 'price_monthly', 'price_yearly', 'features_json', 'is_active'],
      rls: 'select-all',
      seed_count: 3,
    },
    {
      name: 'user_subscriptions',
      phase: 'mvp',
      description: '사용자 구독 현황',
      columns: ['id', 'user_id', 'plan_id', 'started_at', 'expires_at', 'payment_status'],
      rls: 'self-only',
    },
    {
      name: 'content_purchases',
      phase: 'mvp',
      description: '단건 콘텐츠 구매 기록',
      columns: ['id', 'user_id', 'subject_id', 'price', 'purchased_at', 'payment_id'],
      rls: 'self-only',
    },
    {
      name: 'ad_banners',
      phase: 'mvp',
      description: '광고 배너 (free 플랜 노출)',
      columns: ['id', 'title', 'image_url', 'link_url', 'position', 'is_active', 'click_count', 'created_at'],
      rls: 'select-active-public',
      seed_count: 2,
    },
  ],
  phases: {
    mvp: '현재 활성',
    phase2: '향후 확장 (생리학, 스포츠심리학 등 12개 과목)',
    phase3: 'e-License 통합',
  },
  revenue_model: {
    subscription: ['free (광고)', 'pro ₩9,900/월', 'premium ₩19,900/월'],
    one_time: '과목별 단건 구매',
    ad: 'Google AdSense / 내부 광고 (free 플랜)',
  },
}

export async function GET() {
  return NextResponse.json(SCHEMA_META, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}
