-- ================================================================
-- FassT — Supabase PostgreSQL Schema (MVP + Phase2)
-- ================================================================

-- ---------------------------------------------------------------
-- 기존 테이블 (MVP 유지)
-- ---------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  role text check (role in ('trainer', 'member')) default 'trainer',
  -- 온보딩 서베이
  gender text,
  age_group text,
  occupation text,
  occupation_custom text,
  onboarding_completed boolean default false,
  created_at timestamptz default now()
);

-- 기존 테이블에 온보딩 컬럼 추가 (마이그레이션용)
alter table profiles add column if not exists gender text;
alter table profiles add column if not exists age_group text;
alter table profiles add column if not exists occupation text;
alter table profiles add column if not exists occupation_custom text;
alter table profiles add column if not exists onboarding_completed boolean default false;

create table if not exists learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  chapter text not null,
  section text not null,
  is_skipped boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, chapter, section)
);

create table if not exists test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  chapter text not null,
  score int not null,
  total int not null,
  type_scores_json jsonb,
  weak_muscles text[],
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- 신규: 게이미피케이션
-- ---------------------------------------------------------------

create table if not exists user_gamification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade unique,
  xp integer default 0,
  level integer default 1,
  streak_days integer default 0,
  last_study_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  badge_type text not null,
  -- badge_type 값:
  -- 'first_lesson'       첫 학습 완료
  -- 'streak_7'           7일 연속 학습
  -- 'streak_30'          30일 연속 학습
  -- 'chapter_complete'   챕터 완료
  -- 'perfect_test'       테스트 만점
  -- 'leaderboard_top10'  리더보드 TOP 10
  badge_name text not null,
  earned_at timestamptz default now(),
  unique(user_id, badge_type)
);

create table if not exists leaderboard (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade unique,
  weekly_xp integer default 0,
  monthly_xp integer default 0,
  rank integer,
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- 신규: Education 콘텐츠 구조
-- ---------------------------------------------------------------

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null,
  -- category 값:
  -- 'anatomy_basic'        기초 해부학
  -- 'anatomy_functional'   기능 해부학
  -- 'conditioning_massage' 컨디셔닝 마사지
  -- 'conditioning_stretch' 컨디셔닝 스트레칭
  phase text default 'mvp',
  -- phase: 'mvp' / 'phase2' / 'phase3'
  level text,
  -- level: 'beginner' / 'intermediate' / 'advanced' / null(기초)
  xp_reward integer default 10,
  order_index integer default 0,
  is_locked boolean default false,
  unlock_condition text,
  -- 잠금 해제 조건 (예: 'anatomy_functional_intermediate_test_pass')
  thumbnail_url text,
  created_at timestamptz default now()
);

create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  content_json jsonb,
  lesson_type text not null,
  -- lesson_type: 'daily_snap' / 'full_lesson' / 'test'
  xp_reward integer default 5,
  order_index integer default 0,
  duration_minutes integer default 5,
  is_required boolean default false,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- 신규: 랜딩페이지 테스트
-- ---------------------------------------------------------------

create table if not exists landing_test_sessions (
  id uuid primary key default gen_random_uuid(),
  google_user_id text,
  email text,
  name text,
  avatar_url text,
  score integer,
  total_questions integer default 5,
  weak_areas text,
  answers_json jsonb,
  app_download_clicked boolean default false,
  ip_address text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- ---------------------------------------------------------------
-- 신규: subjects — 과목 무한 확장 구조
-- ---------------------------------------------------------------

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text,
  phase text default 'mvp',
  order_index integer,
  is_active boolean default true,
  created_at timestamptz default now()
);

insert into subjects (name, phase, order_index) values
  ('Basic 해부학',     'mvp',    1),
  ('기능 해부학',      'mvp',    2),
  ('교차증후군',       'mvp',    3),
  ('컨디셔닝 마사지',  'mvp',    4),
  ('컨디셔닝 스트레칭','mvp',    5),
  ('생리학',           'phase2', 6),
  ('스포츠심리학',     'phase2', 7),
  ('스포츠사회학',     'phase2', 8),
  ('스포츠윤리',       'phase2', 9),
  ('운동생리학',       'phase2', 10),
  ('운동처방학',       'phase2', 11),
  ('영양학',           'phase2', 12),
  ('필라테스 매트',    'phase2', 13),
  ('필라테스 기구',    'phase2', 14),
  ('바레',             'phase2', 15),
  ('재활운동 CES',     'phase2', 16),
  ('e-License',        'phase3', 17)
on conflict do nothing;

-- courses 테이블에 subject_id 컬럼 추가 (category 컬럼 병존 유지 — 마이그레이션 안전)
alter table courses
  add column if not exists subject_id uuid references subjects(id);

-- ---------------------------------------------------------------
-- 신규: 수입원 테이블
-- ---------------------------------------------------------------

-- 구독 플랜
create table if not exists subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price_monthly integer default 0,
  price_yearly integer default 0,
  features_json jsonb,
  is_active boolean default true
);

insert into subscription_plans (name, price_monthly, price_yearly, features_json) values
  ('free', 0, 0,
    '{"subjects":["기초 해부학 일부"],"daily_questions":5,"ads":true}'),
  ('pro', 9900, 79000,
    '{"subjects":"mvp_all","daily_questions":-1,"ads":false}'),
  ('premium', 19900, 159000,
    '{"subjects":"all","daily_questions":-1,"ads":false,"offline_discount":true}')
on conflict (name) do nothing;

-- 사용자 구독
create table if not exists user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  plan_id uuid references subscription_plans(id),
  started_at timestamptz default now(),
  expires_at timestamptz,
  payment_status text default 'active'
);

-- 콘텐츠 단건 구매
create table if not exists content_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  subject_id uuid references subjects(id),
  price integer,
  purchased_at timestamptz default now(),
  payment_id text
);

-- 광고 배너
create table if not exists ad_banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_url text,
  link_url text,
  position text,
  is_active boolean default true,
  click_count integer default 0,
  created_at timestamptz default now()
);

insert into ad_banners (title, image_url, link_url, position, is_active) values
  ('FassT 프리미엄 업그레이드', '/images/ad-fasst-premium.png', '/pricing', 'dashboard_feed', true),
  ('스포츠 소도구 특가',        '/images/ad-equipment.png',    'https://example.com', 'lesson_end', true)
on conflict do nothing;

-- ---------------------------------------------------------------
-- Phase 2 전용 (참고용 — 현재 비활성)
-- ---------------------------------------------------------------

-- trainer_profiles, user_tickets, reservations,
-- sessions, session_exercises, session_exercise_sets,
-- session_media, reports, report_sections,
-- homework_recommendations, report_questions
-- → Phase 2 시 별도 마이그레이션 파일로 추가

-- ================================================================
-- RLS 정책
-- ================================================================

-- profiles
alter table profiles enable row level security;
create policy "profiles_self" on profiles
  using (id = auth.uid());
create policy "profiles_insert" on profiles
  for insert with check (id = auth.uid());

-- learning_progress
alter table learning_progress enable row level security;
create policy "learning_self" on learning_progress
  using (user_id = auth.uid());
create policy "learning_insert" on learning_progress
  for insert with check (user_id = auth.uid());
create policy "learning_update" on learning_progress
  for update using (user_id = auth.uid());

-- test_results
alter table test_results enable row level security;
create policy "test_results_self" on test_results
  using (user_id = auth.uid());
create policy "test_results_insert" on test_results
  for insert with check (user_id = auth.uid());

-- user_gamification
alter table user_gamification enable row level security;
create policy "gamification_self" on user_gamification
  using (user_id = auth.uid());
create policy "gamification_insert" on user_gamification
  for insert with check (user_id = auth.uid());
create policy "gamification_update" on user_gamification
  for update using (user_id = auth.uid());

-- user_badges
alter table user_badges enable row level security;
create policy "badges_self" on user_badges
  using (user_id = auth.uid());
create policy "badges_insert" on user_badges
  for insert with check (user_id = auth.uid());

-- leaderboard (순위 공개, 본인만 수정)
alter table leaderboard enable row level security;
create policy "leaderboard_select_all" on leaderboard
  for select using (true);
create policy "leaderboard_insert_self" on leaderboard
  for insert with check (user_id = auth.uid());
create policy "leaderboard_update_self" on leaderboard
  for update using (user_id = auth.uid());

-- courses (모두 읽기 허용)
alter table courses enable row level security;
create policy "courses_select_all" on courses
  for select using (true);

-- lessons (모두 읽기 허용)
alter table lessons enable row level security;
create policy "lessons_select_all" on lessons
  for select using (true);

-- landing_test_sessions (INSERT 공개, SELECT 본인만)
alter table landing_test_sessions enable row level security;
create policy "landing_insert_anon" on landing_test_sessions
  for insert with check (true);
create policy "landing_select_self" on landing_test_sessions
  for select using (google_user_id = (auth.jwt() ->> 'sub'));

-- subjects (SELECT 전체 허용)
alter table subjects enable row level security;
create policy "subjects_select_all" on subjects
  for select using (true);

-- subscription_plans (SELECT 전체 허용)
alter table subscription_plans enable row level security;
create policy "plans_select_all" on subscription_plans
  for select using (true);

-- user_subscriptions (본인만)
alter table user_subscriptions enable row level security;
create policy "subscriptions_self_select" on user_subscriptions
  for select using (user_id = auth.uid());
create policy "subscriptions_self_insert" on user_subscriptions
  for insert with check (user_id = auth.uid());
create policy "subscriptions_self_update" on user_subscriptions
  for update using (user_id = auth.uid());

-- content_purchases (본인만)
alter table content_purchases enable row level security;
create policy "purchases_self_select" on content_purchases
  for select using (user_id = auth.uid());
create policy "purchases_self_insert" on content_purchases
  for insert with check (user_id = auth.uid());

-- ad_banners (SELECT is_active=true만 공개)
alter table ad_banners enable row level security;
create policy "ads_select_active" on ad_banners
  for select using (is_active = true);

-- ================================================================
-- 초기 데이터: 코스 시드
-- ================================================================

insert into courses (title, description, category, phase, level, xp_reward, order_index, is_locked)
values
  -- 기초 해부학
  ('신체 구조 기본 개념', '뼈대·근육·관절의 기초 이해', 'anatomy_basic', 'mvp', null, 10, 1, false),
  ('뼈대·근육·관절 기초', '주요 뼈대와 근육군의 위치 파악', 'anatomy_basic', 'mvp', null, 10, 2, false),
  -- 기능 해부학
  ('기시(O) & 정지(I) & 움직임 — 초급', '주요 근육의 기시·정지·작용 이해', 'anatomy_functional', 'mvp', 'beginner', 15, 3, false),
  ('작용 & 주의사항 — 중급', '근육 작용 심화 + 트레이닝 주의사항', 'anatomy_functional', 'mvp', 'intermediate', 20, 4, false),
  ('컨디셔닝 적용 — 상급', '마사지·스트레칭 연계 고급 적용', 'anatomy_functional', 'mvp', 'advanced', 30, 5, true),
  -- 컨디셔닝 마사지
  ('마사지 테크닉 기초', '올바른 마사지 자세와 압력 조절', 'conditioning_massage', 'mvp', null, 20, 6, true),
  ('부위 & 증상별 마사지 적용', '증상 분석 후 마사지 시퀀스 구성', 'conditioning_massage', 'mvp', null, 25, 7, true),
  -- 컨디셔닝 스트레칭
  ('스트레칭 테크닉 기초', '패시브/액티브 스트레칭 차이와 적용', 'conditioning_stretch', 'mvp', null, 20, 8, true),
  ('부위 & 증상별 스트레칭 적용', '증상별 스트레칭 프로그램 설계', 'conditioning_stretch', 'mvp', null, 25, 9, true)
on conflict do nothing;
