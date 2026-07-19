-- ============================================================================
-- baseline_schema.sql — 프로덕션 sbketzgadjvzedbayesc 실측 기반 baseline
-- 생성일: 2026-07-18
-- 근거: docs/schema-dump/q0~q4.csv (information_schema / pg_catalog 실측 덤프)
-- 용도: dev 전용 Supabase 프로젝트에 프로덕션 스키마를 재현
-- 주의: auth 스키마 users 테이블을 참조하는 FK 3개는 의도적으로 제외
--       (chapter_test_history.user_id / exam_registrations.user_id / user_goals.user_id)
-- 생성 방식: CSV를 기계적으로 전사 (추측 없이 실측값만 사용)
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) 테이블 생성 (FK 제외 — 아래에서 일괄 ALTER)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.access_codes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  certification_id uuid,
  expires_at timestamp with time zone,
  max_uses integer,
  current_uses integer DEFAULT 0,
  is_active boolean DEFAULT TRUE,
  created_at timestamp with time zone DEFAULT now(),
  label text,
  source text,
  CONSTRAINT access_codes_pkey PRIMARY KEY (id),
  CONSTRAINT access_codes_code_key UNIQUE (code)
);

CREATE TABLE public.ad_banners (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text,
  image_url text,
  link_url text,
  position text,
  is_active boolean DEFAULT TRUE,
  click_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ad_banners_pkey PRIMARY KEY (id)
);

CREATE TABLE public.categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  icon text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT TRUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.certification_subjects (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  certification_id uuid,
  subject_id uuid,
  is_required boolean DEFAULT TRUE,
  display_order integer DEFAULT 0,
  CONSTRAINT certification_subjects_pkey PRIMARY KEY (id)
);

CREATE TABLE public.certifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  category_id uuid,
  name text NOT NULL,
  type text DEFAULT 'national'::text,
  level text,
  exam_date date,
  is_active boolean DEFAULT TRUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  exam_type text DEFAULT 'written'::text,
  phase text DEFAULT 'mvp'::text,
  order_index integer,
  partner_id uuid,
  slug text,
  CONSTRAINT certifications_pkey PRIMARY KEY (id),
  CONSTRAINT certifications_type_check CHECK (type = ANY (ARRAY['national'::text, 'private'::text]))
);

CREATE TABLE public.chapter_cards (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  chapter_id uuid NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL,
  explanation text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  image_url text,
  image_caption text,
  image_source text,
  reference_text text,
  exam_years jsonb DEFAULT '[]'::jsonb,
  star_rating smallint DEFAULT 0,
  key_points jsonb DEFAULT '[]'::jsonb,
  content_type text,
  question_format text,
  difficulty integer DEFAULT 2,
  answer_index jsonb,
  linked_quiz_id uuid,
  CONSTRAINT chapter_questions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.chapter_session_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  chapter_id uuid NOT NULL,
  session_id uuid DEFAULT gen_random_uuid(),
  session_start timestamp with time zone DEFAULT now(),
  session_end timestamp with time zone,
  last_slide integer,
  exit_point text,
  is_completed boolean DEFAULT FALSE,
  page_type text DEFAULT 'test'::text,
  slide_total integer,
  completion_rate double precision,
  day_of_week smallint,
  hour_of_day smallint,
  last_sub_slide smallint,
  CONSTRAINT chapter_session_logs_pkey PRIMARY KEY (id),
  CONSTRAINT chapter_session_logs_exit_point_check CHECK (exit_point = ANY (ARRAY['lesson_complete'::text, 'user_exit'::text, 'unload'::text, 'test_submit'::text, 'mini_quiz'::text, 'slide'::text]))
);

CREATE TABLE public.chapter_stats (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id text,
  chapter_id text,
  subject_id text,
  total_attempts integer DEFAULT 0,
  total_correct integer DEFAULT 0,
  avg_score double precision DEFAULT 0,
  wrong_rate double precision DEFAULT 0,
  last_attempt_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  lesson_completed boolean DEFAULT FALSE,
  mini_quiz_correct integer DEFAULT 0,
  mini_quiz_total integer DEFAULT 0,
  lesson_completed_at timestamp with time zone,
  latest_score integer,
  best_score integer,
  test_attempts integer DEFAULT 0,
  study_duration integer DEFAULT 0,
  total_questions integer,
  certification_id uuid,
  CONSTRAINT chapter_stats_pkey PRIMARY KEY (id)
);

CREATE TABLE public.chapter_test_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  chapter_id uuid,
  score integer NOT NULL,
  attempt_number integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chapter_test_history_pkey PRIMARY KEY (id)
);

CREATE TABLE public.chapter_test_results (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  chapter_id uuid NOT NULL,
  score integer NOT NULL,
  total integer NOT NULL,
  passed boolean DEFAULT FALSE,
  xp_earned integer DEFAULT 0,
  answers_json jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chapter_test_results_pkey PRIMARY KEY (id)
);

CREATE TABLE public.chapters (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  course_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT TRUE,
  created_at timestamp with time zone DEFAULT now(),
  video_url text,
  audio_url text,
  image_url text,
  content_type text DEFAULT 'image_slide'::text,
  year_tags text[] DEFAULT '{}'::text[],
  frequency_score integer DEFAULT 0,
  content_json jsonb,
  CONSTRAINT chapters_pkey PRIMARY KEY (id)
);

CREATE TABLE public.content_purchases (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  subject_id uuid,
  price integer,
  purchased_at timestamp with time zone DEFAULT now(),
  payment_id text,
  CONSTRAINT content_purchases_pkey PRIMARY KEY (id)
);

CREATE TABLE public.course_certifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  course_id uuid NOT NULL,
  certification_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_certifications_pkey PRIMARY KEY (id),
  CONSTRAINT course_certifications_course_id_certification_id_key UNIQUE (course_id, certification_id)
);

CREATE TABLE public.courses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  phase text DEFAULT 'mvp'::text,
  level text,
  xp_reward integer DEFAULT 10,
  order_index integer DEFAULT 0,
  is_locked boolean DEFAULT FALSE,
  unlock_condition text,
  thumbnail_url text,
  created_at timestamp with time zone DEFAULT now(),
  subject_id uuid,
  certification_id uuid,
  CONSTRAINT courses_pkey PRIMARY KEY (id)
);

CREATE TABLE public.exam_registrations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  round integer NOT NULL,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT exam_registrations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.exam_results (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  schedule_id uuid,
  round integer NOT NULL,
  score integer NOT NULL,
  total_questions integer DEFAULT 100 NOT NULL,
  subject_scores jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  passed boolean,
  abandoned boolean DEFAULT FALSE,
  time_remaining integer,
  CONSTRAINT exam_results_pkey PRIMARY KEY (id)
);

CREATE TABLE public.exam_schedules (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  round integer NOT NULL,
  exam_date date NOT NULL,
  start_time time without time zone DEFAULT '10:00:00'::time without time zone NOT NULL,
  title text NOT NULL,
  description text,
  is_active boolean DEFAULT TRUE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  certification_id uuid,
  exam_type text DEFAULT 'written'::text,
  frequency text DEFAULT 'weekly'::text,
  CONSTRAINT exam_schedules_pkey PRIMARY KEY (id)
);

CREATE TABLE public.guest_test_results (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  guest_id uuid NOT NULL,
  score integer,
  total_questions integer,
  correct_answers integer,
  level_result text,
  answers_json jsonb,
  is_converted boolean DEFAULT FALSE,
  created_at timestamp with time zone DEFAULT now(),
  is_major boolean DEFAULT FALSE,
  CONSTRAINT guest_test_results_pkey PRIMARY KEY (id)
);

CREATE TABLE public.landing_test_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  google_user_id text,
  email text,
  name text,
  avatar_url text,
  score integer,
  total_questions integer DEFAULT 5,
  weak_areas text,
  answers_json jsonb,
  app_download_clicked boolean DEFAULT FALSE,
  ip_address text,
  is_guest boolean DEFAULT FALSE,
  guest_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT landing_test_sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.leaderboard (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  weekly_xp integer DEFAULT 0,
  monthly_xp integer DEFAULT 0,
  rank integer,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT leaderboard_pkey PRIMARY KEY (id),
  CONSTRAINT leaderboard_user_id_key UNIQUE (user_id)
);

CREATE TABLE public.learning_progress (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  chapter text NOT NULL,
  section text NOT NULL,
  is_skipped boolean DEFAULT FALSE,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT learning_progress_pkey PRIMARY KEY (id),
  CONSTRAINT learning_progress_user_id_chapter_section_key UNIQUE (user_id, chapter, section)
);

CREATE TABLE public.learning_progress_v2 (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  chapter_id uuid,
  course_id uuid,
  certification_id uuid,
  status text DEFAULT 'not_started'::text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT learning_progress_v2_pkey PRIMARY KEY (id),
  CONSTRAINT learning_progress_v2_user_id_chapter_id_key UNIQUE (user_id, chapter_id)
);

CREATE TABLE public.lesson_questions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  lesson_id uuid NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL,
  answer_index integer NOT NULL,
  explanation text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lesson_questions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.lesson_slide_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  chapter_id uuid NOT NULL,
  session_id uuid,
  slide_index integer NOT NULL,
  slide_total integer,
  slide_retention_time double precision,
  checkbox_click_interval double precision,
  checkbox_intervals_raw jsonb,
  is_completed boolean DEFAULT FALSE,
  created_at timestamp with time zone DEFAULT now(),
  checkbox_order_raw jsonb,
  checkbox_total integer,
  revisit_count integer DEFAULT 0,
  is_revisit boolean DEFAULT FALSE,
  image_zoom_count integer DEFAULT 0,
  sub_slide smallint,
  CONSTRAINT lesson_slide_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.lessons (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  course_id uuid NOT NULL,
  title text NOT NULL,
  content_json jsonb,
  lesson_type text NOT NULL,
  xp_reward integer DEFAULT 5,
  order_index integer DEFAULT 0,
  duration_minutes integer DEFAULT 5,
  is_required boolean DEFAULT FALSE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lessons_pkey PRIMARY KEY (id)
);

CREATE TABLE public.mock_exam_bookings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  certification_id uuid,
  exam_type text NOT NULL,
  week_number integer NOT NULL,
  week_start_date date NOT NULL,
  selected_date date NOT NULL,
  status text DEFAULT 'confirmed'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mock_exam_bookings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.oral_exam_registrations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  certification_id uuid,
  exam_date date NOT NULL,
  week_number integer NOT NULL,
  slot_number integer NOT NULL,
  ticket_number integer NOT NULL,
  start_time time without time zone NOT NULL,
  is_completed boolean DEFAULT FALSE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT oral_exam_registrations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.partners (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  logo_url text,
  website_url text,
  revenue_share numeric DEFAULT 0.3,
  contact_email text,
  is_active boolean DEFAULT TRUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT partners_pkey PRIMARY KEY (id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  name text,
  avatar_url text,
  role text DEFAULT 'trainer'::text,
  gender text,
  age_group text,
  occupation text,
  occupation_custom text,
  onboarding_completed boolean DEFAULT FALSE,
  created_at timestamp with time zone DEFAULT now(),
  learning_style text,
  style_tested_at timestamp with time zone,
  selected_subjects jsonb DEFAULT '[]'::jsonb,
  selected_cert text,
  required_subjects jsonb DEFAULT '[]'::jsonb,
  additional_subjects jsonb DEFAULT '[]'::jsonb,
  exam_target_date date,
  region text,
  daily_study_hours integer,
  subscription_plan text DEFAULT 'free'::text,
  subscription_started_at timestamp with time zone,
  subscription_expires_at timestamp with time zone,
  trial_started_at timestamp with time zone,
  trial_expires_at timestamp with time zone,
  sub text,
  phone text,
  primary_provider text,
  linked_providers text[] DEFAULT '{}'::text[],
  daily_study_time integer,
  daily_study_count integer,
  study_time_slot text,
  push_enabled boolean DEFAULT FALSE,
  certification_id uuid,
  is_major boolean DEFAULT FALSE,
  cert_type text,
  style_acknowledged_at timestamp with time zone,
  mode_intro_acknowledged_at timestamp with time zone,
  code_popup_shown boolean DEFAULT FALSE,
  survey_completed boolean DEFAULT FALSE,
  access_code_used text,
  chapter_star_ratings jsonb DEFAULT '{}'::jsonb,
  access_unlocked boolean DEFAULT FALSE,
  streak_days integer DEFAULT 0,
  last_study_date date,
  tendency_analyzed boolean DEFAULT FALSE,
  learning_style_answers jsonb,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_sub_key UNIQUE (sub),
  CONSTRAINT profiles_phone_key UNIQUE (phone),
  CONSTRAINT profiles_email_unique UNIQUE (email),
  CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['trainer'::text, 'member'::text]))
);

CREATE TABLE public.question_stats (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  question_id text,
  chapter_id text,
  total_attempts integer DEFAULT 0,
  total_correct integer DEFAULT 0,
  wrong_rate double precision DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT question_stats_pkey PRIMARY KEY (id),
  CONSTRAINT question_stats_user_id_question_id_key UNIQUE (user_id, question_id)
);

CREATE TABLE public.quiz_performance_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  chapter_id uuid,
  question_id uuid NOT NULL,
  question_type integer NOT NULL,
  quiz_bridge_time double precision,
  response_time double precision,
  answer_given integer,
  is_correct boolean,
  wrong_answer_vulnerability double precision DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  quiz_entered_at timestamp with time zone DEFAULT now(),
  after_wrong_action text,
  retry_count integer DEFAULT 0,
  explanation_viewed boolean DEFAULT FALSE,
  CONSTRAINT quiz_performance_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.subjects (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  phase text DEFAULT 'mvp'::text,
  order_index integer,
  is_active boolean DEFAULT TRUE,
  created_at timestamp with time zone DEFAULT now(),
  category_id uuid,
  event text,
  CONSTRAINT subjects_pkey PRIMARY KEY (id)
);

CREATE TABLE public.subscription_features (
  plan text NOT NULL,
  max_chapters_per_subject integer,
  full_report boolean DEFAULT FALSE,
  d_day_plan boolean DEFAULT FALSE,
  ai_questions boolean DEFAULT FALSE,
  pass_prediction boolean DEFAULT FALSE,
  wrong_note boolean DEFAULT FALSE,
  ads boolean DEFAULT TRUE,
  CONSTRAINT subscription_features_pkey PRIMARY KEY (plan)
);

CREATE TABLE public.subscription_plans (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  price_monthly integer DEFAULT 0,
  price_yearly integer DEFAULT 0,
  features_json jsonb,
  is_active boolean DEFAULT TRUE,
  CONSTRAINT subscription_plans_pkey PRIMARY KEY (id),
  CONSTRAINT subscription_plans_name_key UNIQUE (name)
);

CREATE TABLE public.test_results (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  chapter text NOT NULL,
  score integer NOT NULL,
  total integer NOT NULL,
  type_scores_json jsonb,
  weak_muscles text[],
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT test_results_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_access_codes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  code_id uuid,
  used_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_access_codes_pkey PRIMARY KEY (id),
  CONSTRAINT user_access_codes_user_id_code_id_key UNIQUE (user_id, code_id)
);

CREATE TABLE public.user_badges (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  badge_type text NOT NULL,
  badge_name text NOT NULL,
  earned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_badges_pkey PRIMARY KEY (id),
  CONSTRAINT user_badges_user_id_badge_type_key UNIQUE (user_id, badge_type)
);

CREATE TABLE public.user_certifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  cert_id text NOT NULL,
  cert_label text NOT NULL,
  subjects jsonb DEFAULT '[]'::jsonb NOT NULL,
  exam_type text DEFAULT 'written'::text NOT NULL,
  is_active boolean DEFAULT TRUE NOT NULL,
  order_index integer DEFAULT 0 NOT NULL,
  added_at timestamp with time zone DEFAULT now(),
  last_studied_at timestamp with time zone,
  CONSTRAINT user_certifications_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  event_type text,
  meta jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_events_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_gamification (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  xp integer DEFAULT 0,
  level integer DEFAULT 1,
  streak_days integer DEFAULT 0,
  last_study_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_gamification_pkey PRIMARY KEY (id),
  CONSTRAINT user_gamification_user_id_key UNIQUE (user_id)
);

CREATE TABLE public.user_goals (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  profile_id uuid,
  user_id uuid,
  title text,
  target_date date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_goals_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_reviews (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  star_rating smallint NOT NULL,
  review_text text,
  is_public boolean DEFAULT FALSE,
  is_featured boolean DEFAULT FALSE,
  created_at timestamp with time zone DEFAULT now(),
  survey_answers jsonb,
  feedback_text text,
  CONSTRAINT user_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT user_reviews_star_rating_check CHECK ((star_rating >= 1) AND (star_rating <= 5))
);

CREATE TABLE public.user_subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  plan_id uuid,
  started_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  payment_status text DEFAULT 'active'::text,
  CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_wrong_answers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  question_id uuid NOT NULL,
  chapter_id uuid,
  selected_index integer NOT NULL,
  correct_index integer,
  wrong_count integer DEFAULT 1 NOT NULL,
  last_wrong_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_wrong_answers_pkey PRIMARY KEY (id),
  CONSTRAINT user_wrong_answers_user_id_question_id_key UNIQUE (user_id, question_id)
);

CREATE TABLE public.video_bookmarks (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  video_url text,
  video_title text,
  video_thumbnail text,
  bookmarked_at timestamp with time zone DEFAULT now(),
  CONSTRAINT video_bookmarks_pkey PRIMARY KEY (id)
);

CREATE TABLE public.wrong_answers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  chapter_id uuid NOT NULL,
  question_id uuid NOT NULL,
  selected_option text,
  correct_option text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wrong_answers_pkey PRIMARY KEY (id)
);

-- ─────────────────────────────────────────────────────────────
-- 2) 외래키 일괄 추가 (auth 스키마 users 참조 FK 3개 제외)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.access_codes ADD CONSTRAINT access_codes_certification_id_fkey FOREIGN KEY (certification_id) REFERENCES public.certifications (id);
ALTER TABLE public.certification_subjects ADD CONSTRAINT certification_subjects_certification_id_fkey FOREIGN KEY (certification_id) REFERENCES public.certifications (id);
ALTER TABLE public.certification_subjects ADD CONSTRAINT certification_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects (id);
ALTER TABLE public.certifications ADD CONSTRAINT certifications_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories (id);
ALTER TABLE public.certifications ADD CONSTRAINT certifications_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners (id);
ALTER TABLE public.chapter_cards ADD CONSTRAINT chapter_cards_linked_quiz_id_fkey FOREIGN KEY (linked_quiz_id) REFERENCES public.chapter_cards (id);
ALTER TABLE public.chapter_cards ADD CONSTRAINT chapter_questions_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters (id);
ALTER TABLE public.chapter_stats ADD CONSTRAINT chapter_stats_certification_id_fkey FOREIGN KEY (certification_id) REFERENCES public.certifications (id);
ALTER TABLE public.chapter_test_history ADD CONSTRAINT chapter_test_history_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters (id);
ALTER TABLE public.chapter_test_results ADD CONSTRAINT chapter_test_results_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters (id);
ALTER TABLE public.chapter_test_results ADD CONSTRAINT chapter_test_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.chapters ADD CONSTRAINT chapters_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses (id);
ALTER TABLE public.content_purchases ADD CONSTRAINT content_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.content_purchases ADD CONSTRAINT content_purchases_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects (id);
ALTER TABLE public.course_certifications ADD CONSTRAINT course_certifications_certification_id_fkey FOREIGN KEY (certification_id) REFERENCES public.certifications (id);
ALTER TABLE public.course_certifications ADD CONSTRAINT course_certifications_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses (id);
ALTER TABLE public.courses ADD CONSTRAINT courses_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects (id);
ALTER TABLE public.courses ADD CONSTRAINT courses_certification_id_fkey FOREIGN KEY (certification_id) REFERENCES public.certifications (id);
ALTER TABLE public.exam_results ADD CONSTRAINT exam_results_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.exam_schedules (id);
ALTER TABLE public.exam_results ADD CONSTRAINT exam_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.exam_schedules ADD CONSTRAINT exam_schedules_certification_id_fkey FOREIGN KEY (certification_id) REFERENCES public.certifications (id);
ALTER TABLE public.leaderboard ADD CONSTRAINT leaderboard_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.learning_progress ADD CONSTRAINT learning_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.learning_progress_v2 ADD CONSTRAINT learning_progress_v2_certification_id_fkey FOREIGN KEY (certification_id) REFERENCES public.certifications (id);
ALTER TABLE public.learning_progress_v2 ADD CONSTRAINT learning_progress_v2_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters (id);
ALTER TABLE public.learning_progress_v2 ADD CONSTRAINT learning_progress_v2_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses (id);
ALTER TABLE public.lesson_questions ADD CONSTRAINT lesson_questions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons (id);
ALTER TABLE public.lessons ADD CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses (id);
ALTER TABLE public.mock_exam_bookings ADD CONSTRAINT mock_exam_bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.oral_exam_registrations ADD CONSTRAINT oral_exam_registrations_certification_id_fkey FOREIGN KEY (certification_id) REFERENCES public.certifications (id);
ALTER TABLE public.oral_exam_registrations ADD CONSTRAINT oral_exam_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_certification_id_fkey FOREIGN KEY (certification_id) REFERENCES public.certifications (id);
ALTER TABLE public.question_stats ADD CONSTRAINT question_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.subjects ADD CONSTRAINT subjects_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories (id);
ALTER TABLE public.test_results ADD CONSTRAINT test_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.user_access_codes ADD CONSTRAINT user_access_codes_code_id_fkey FOREIGN KEY (code_id) REFERENCES public.access_codes (id);
ALTER TABLE public.user_access_codes ADD CONSTRAINT user_access_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.user_certifications ADD CONSTRAINT user_certifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.user_events ADD CONSTRAINT user_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.user_gamification ADD CONSTRAINT user_gamification_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.user_goals ADD CONSTRAINT user_goals_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles (id);
ALTER TABLE public.user_reviews ADD CONSTRAINT user_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans (id);
ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.user_wrong_answers ADD CONSTRAINT user_wrong_answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.video_bookmarks ADD CONSTRAINT video_bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.wrong_answers ADD CONSTRAINT wrong_answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);

-- ─────────────────────────────────────────────────────────────
-- 3) 인덱스 (PK/UNIQUE 제약이 자동 생성하는 인덱스는 제외, 나머지 원문 그대로)
-- ─────────────────────────────────────────────────────────────
CREATE INDEX idx_chapter_questions_chapter_id ON public.chapter_cards USING btree (chapter_id);
CREATE INDEX idx_cq_chapter_id ON public.chapter_cards USING btree (chapter_id);
CREATE INDEX idx_cq_star_rating ON public.chapter_cards USING btree (star_rating DESC);
CREATE INDEX idx_session_logs_exit ON public.chapter_session_logs USING btree (exit_point);
CREATE INDEX idx_session_logs_user ON public.chapter_session_logs USING btree (user_id);
CREATE UNIQUE INDEX chapter_stats_user_chapter_cert_uidx ON public.chapter_stats USING btree (user_id, chapter_id, certification_id) WHERE (certification_id IS NOT NULL);
CREATE UNIQUE INDEX chapter_stats_user_chapter_null_cert_uidx ON public.chapter_stats USING btree (user_id, chapter_id) WHERE (certification_id IS NULL);
CREATE INDEX idx_chapter_stats_user_attempt ON public.chapter_stats USING btree (user_id, last_attempt_at);
CREATE INDEX idx_chapter_stats_user_id ON public.chapter_stats USING btree (user_id);
CREATE INDEX idx_test_history_created_at ON public.chapter_test_history USING btree (created_at);
CREATE INDEX idx_test_history_user_chapter ON public.chapter_test_history USING btree (user_id, chapter_id);
CREATE INDEX idx_ctr_passed ON public.chapter_test_results USING btree (user_id, passed);
CREATE INDEX idx_ctr_user ON public.chapter_test_results USING btree (user_id);
CREATE INDEX idx_ctr_user_chapter ON public.chapter_test_results USING btree (user_id, chapter_id);
CREATE INDEX idx_chapters_course_id ON public.chapters USING btree (course_id);
CREATE INDEX idx_course_certifications_cert ON public.course_certifications USING btree (certification_id);
CREATE INDEX idx_course_certifications_course ON public.course_certifications USING btree (course_id);
CREATE INDEX idx_courses_certification_id ON public.courses USING btree (certification_id);
CREATE INDEX idx_courses_subject_cert ON public.courses USING btree (subject_id, certification_id);
CREATE INDEX idx_lp_completed ON public.learning_progress USING btree (user_id, completed_at DESC);
CREATE INDEX idx_lp_user ON public.learning_progress USING btree (user_id);
CREATE INDEX idx_lp_user_chapter ON public.learning_progress USING btree (user_id, chapter);
CREATE INDEX learning_progress_v2_user_id_certification_id_idx ON public.learning_progress_v2 USING btree (user_id, certification_id);
CREATE INDEX learning_progress_v2_user_id_course_id_idx ON public.learning_progress_v2 USING btree (user_id, course_id);
CREATE INDEX learning_progress_v2_user_id_idx ON public.learning_progress_v2 USING btree (user_id);
CREATE INDEX idx_lesson_slide_logs_user_id ON public.lesson_slide_logs USING btree (user_id);
CREATE INDEX idx_slide_logs_chapter ON public.lesson_slide_logs USING btree (chapter_id);
CREATE INDEX idx_slide_logs_user ON public.lesson_slide_logs USING btree (user_id);
CREATE UNIQUE INDEX idx_mock_exam_unique ON public.mock_exam_bookings USING btree (user_id, certification_id, exam_type, selected_date);
CREATE INDEX idx_mock_exam_week ON public.mock_exam_bookings USING btree (user_id, certification_id, exam_type, week_number);
CREATE INDEX idx_oral_reg_exam_date ON public.oral_exam_registrations USING btree (exam_date);
CREATE INDEX idx_oral_reg_user_id ON public.oral_exam_registrations USING btree (user_id);
CREATE INDEX idx_profiles_certification_id ON public.profiles USING btree (certification_id);
CREATE INDEX idx_profiles_phone ON public.profiles USING btree (phone) WHERE (phone IS NOT NULL);
CREATE INDEX idx_profiles_sub ON public.profiles USING btree (sub) WHERE (sub IS NOT NULL);
CREATE INDEX idx_quiz_logs_user ON public.quiz_performance_logs USING btree (user_id);
CREATE INDEX idx_uac_user_id ON public.user_access_codes USING btree (user_id);
CREATE INDEX idx_user_certifications_active ON public.user_certifications USING btree (user_id, is_active);
CREATE INDEX idx_user_certifications_user_id ON public.user_certifications USING btree (user_id);
CREATE INDEX idx_user_wrong_answers_chapter ON public.user_wrong_answers USING btree (chapter_id);
CREATE INDEX idx_user_wrong_answers_user ON public.user_wrong_answers USING btree (user_id);

-- ─────────────────────────────────────────────────────────────
-- 4) RLS 활성화 (전 45+개 테이블 — 실측 rowsecurity=true)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_test_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_slide_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oral_exam_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wrong_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wrong_answers ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 5) RLS 정책 (원문 그대로 재현)
--    ※ chapter_session_logs / lesson_slide_logs / quiz_performance_logs 는
--      RLS 활성화만 되고 정책 0개 — service_role 우회 구조라 그대로 유지
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "ads_select_active" ON public.ad_banners
  FOR SELECT
  TO public
  USING ((is_active = true));

CREATE POLICY "certifications_public_read" ON public.certifications
  FOR SELECT
  TO anon
  USING ((is_active = true));

CREATE POLICY "allow_read_chapter_questions" ON public.chapter_cards
  FOR SELECT
  TO public
  USING (TRUE);

CREATE POLICY "anyone can read questions" ON public.chapter_cards
  FOR SELECT
  TO public
  USING (TRUE);

CREATE POLICY "chapter_questions_select_all" ON public.chapter_cards
  FOR SELECT
  TO public
  USING (TRUE);

CREATE POLICY "allow_insert_chapter_stats" ON public.chapter_stats
  FOR INSERT
  TO public
  WITH CHECK (TRUE);

CREATE POLICY "allow_select_chapter_stats" ON public.chapter_stats
  FOR SELECT
  TO public
  USING (TRUE);

CREATE POLICY "allow_update_chapter_stats" ON public.chapter_stats
  FOR UPDATE
  TO public
  USING (TRUE);

CREATE POLICY "users can insert own stats" ON public.chapter_stats
  FOR INSERT
  TO public
  WITH CHECK ((user_id = (auth.uid())::text));

CREATE POLICY "users can read own stats" ON public.chapter_stats
  FOR SELECT
  TO public
  USING ((user_id = (auth.uid())::text));

CREATE POLICY "users can update own stats" ON public.chapter_stats
  FOR UPDATE
  TO public
  USING ((user_id = (auth.uid())::text));

CREATE POLICY "본인 데이터만 접근" ON public.chapter_test_history
  FOR ALL
  TO public
  USING (((auth.uid())::text = (user_id)::text));

CREATE POLICY "chapter_test_results_self_insert" ON public.chapter_test_results
  FOR INSERT
  TO public
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "chapter_test_results_self_select" ON public.chapter_test_results
  FOR SELECT
  TO public
  USING ((user_id = auth.uid()));

CREATE POLICY "chapters_select_all" ON public.chapters
  FOR SELECT
  TO public
  USING (TRUE);

CREATE POLICY "purchases_self_insert" ON public.content_purchases
  FOR INSERT
  TO public
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "purchases_self_select" ON public.content_purchases
  FOR SELECT
  TO public
  USING ((user_id = auth.uid()));

CREATE POLICY "course_certifications_select_all" ON public.course_certifications
  FOR SELECT
  TO public
  USING (TRUE);

CREATE POLICY "courses_select_all" ON public.courses
  FOR SELECT
  TO public
  USING (TRUE);

CREATE POLICY "users can insert own registration" ON public.exam_registrations
  FOR INSERT
  TO public
  WITH CHECK (TRUE);

CREATE POLICY "users can read own registration" ON public.exam_registrations
  FOR SELECT
  TO public
  USING (TRUE);

CREATE POLICY "users can insert own result" ON public.exam_results
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "users can read own result" ON public.exam_results
  FOR SELECT
  TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "guest_test_insert" ON public.guest_test_results
  FOR INSERT
  TO public
  WITH CHECK (TRUE);

CREATE POLICY "guest_test_select" ON public.guest_test_results
  FOR SELECT
  TO public
  USING (TRUE);

CREATE POLICY "guest_test_update_converted" ON public.guest_test_results
  FOR UPDATE
  TO public
  USING (TRUE);

CREATE POLICY "landing_insert_anon" ON public.landing_test_sessions
  FOR INSERT
  TO public
  WITH CHECK (TRUE);

CREATE POLICY "landing_select_self" ON public.landing_test_sessions
  FOR SELECT
  TO public
  USING ((google_user_id = (auth.jwt() ->> 'sub'::text)));

CREATE POLICY "leaderboard_insert_self" ON public.leaderboard
  FOR INSERT
  TO public
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "leaderboard_select_all" ON public.leaderboard
  FOR SELECT
  TO public
  USING (TRUE);

CREATE POLICY "leaderboard_update_self" ON public.leaderboard
  FOR UPDATE
  TO public
  USING ((user_id = auth.uid()));

CREATE POLICY "learning_insert" ON public.learning_progress
  FOR INSERT
  TO public
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "learning_self" ON public.learning_progress
  FOR ALL
  TO public
  USING ((user_id = auth.uid()));

CREATE POLICY "learning_update" ON public.learning_progress
  FOR UPDATE
  TO public
  USING ((user_id = auth.uid()));

CREATE POLICY "lesson_questions_select_all" ON public.lesson_questions
  FOR SELECT
  TO public
  USING (TRUE);

CREATE POLICY "lessons_select_all" ON public.lessons
  FOR SELECT
  TO public
  USING (TRUE);

CREATE POLICY "본인 신청 등록" ON public.oral_exam_registrations
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "본인 신청 조회" ON public.oral_exam_registrations
  FOR SELECT
  TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT
  TO public
  WITH CHECK ((id = auth.uid()));

CREATE POLICY "profiles_self" ON public.profiles
  FOR ALL
  TO public
  USING ((id = auth.uid()));

CREATE POLICY "subjects_select_all" ON public.subjects
  FOR SELECT
  TO public
  USING (TRUE);

CREATE POLICY "plans_select_all" ON public.subscription_plans
  FOR SELECT
  TO public
  USING (TRUE);

CREATE POLICY "test_results_insert" ON public.test_results
  FOR INSERT
  TO public
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "test_results_self" ON public.test_results
  FOR ALL
  TO public
  USING ((user_id = auth.uid()));

CREATE POLICY "본인 코드 등록" ON public.user_access_codes
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "본인 코드 조회" ON public.user_access_codes
  FOR SELECT
  TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "badges_insert" ON public.user_badges
  FOR INSERT
  TO public
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "badges_self" ON public.user_badges
  FOR ALL
  TO public
  USING ((user_id = auth.uid()));

CREATE POLICY "Users can update own certifications" ON public.user_certifications
  FOR UPDATE
  TO public
  USING (((user_id)::text = (auth.uid())::text))
  WITH CHECK (((user_id)::text = (auth.uid())::text));

CREATE POLICY "user_certifications_self" ON public.user_certifications
  FOR ALL
  TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "gamification_insert" ON public.user_gamification
  FOR INSERT
  TO public
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "gamification_self" ON public.user_gamification
  FOR ALL
  TO public
  USING ((user_id = auth.uid()));

CREATE POLICY "gamification_update" ON public.user_gamification
  FOR UPDATE
  TO public
  USING ((user_id = auth.uid()));

CREATE POLICY "subscriptions_self_insert" ON public.user_subscriptions
  FOR INSERT
  TO public
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "subscriptions_self_select" ON public.user_subscriptions
  FOR SELECT
  TO public
  USING ((user_id = auth.uid()));

CREATE POLICY "subscriptions_self_update" ON public.user_subscriptions
  FOR UPDATE
  TO public
  USING ((user_id = auth.uid()));

COMMIT;
