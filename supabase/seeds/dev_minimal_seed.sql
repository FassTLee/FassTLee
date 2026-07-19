-- ============================================================================
-- dev_minimal_seed.sql — dev 프로젝트(jgweeoeikhdjcgkitjfl) 3슬라이드 UX 로그 테스트용 최소 시드
-- 생성일: 2026-07-18 / 근거: 프로덕션 sbketzgadjvzedbayesc 실값 SELECT 복사 (UUID 동일)
-- 선정: course "해부학 기초"(order 1) > chapter "해부학적 자세와 기본 자세"(order 1)
-- 실행: 오너가 dev SQL Editor에서 실행 (여기서는 파일 생성만)
-- baseline(00000000000000_baseline_schema.sql) 컬럼만 사용
-- ============================================================================

BEGIN;

-- 1. partners — certification이 참조하는 파트너 (1건)
INSERT INTO public.partners (id, name, logo_url, website_url, revenue_share, contact_email, is_active, created_at)
VALUES ('2c21899f-3c40-41af-9051-f7f8a2fb71ac', 'IIPA (국제통합필라테스협회)', NULL, NULL, 0.3, NULL, TRUE, '2026-06-29T16:34:28.078849+00:00');

-- 2. categories — certification/subject가 참조하는 카테고리 (1건)
INSERT INTO public.categories (id, name, icon, display_order, is_active, created_at)
VALUES ('410d8994-8574-448a-9a6e-1c383bb2a009', '체육', '🏋️', 1, TRUE, '2026-05-16T14:40:08.884254+00:00');

-- 3. certifications — IIPA Lv1 (1건)
INSERT INTO public.certifications (id, category_id, name, type, level, exam_date, is_active, description, created_at, exam_type, phase, order_index, partner_id, slug)
VALUES ('e52ea177-15cd-4a92-b624-391e69c160cb', '410d8994-8574-448a-9a6e-1c383bb2a009', 'IIPA 필라테스 지도자 자격증 Lv1', 'private', 'lv1', NULL, TRUE, NULL, '2026-06-29T16:34:45.783823+00:00', 'written', 'mvp', 10, '2c21899f-3c40-41af-9051-f7f8a2fb71ac', 'iipa-pilates-lv1');

-- 4. subjects — 필라테스 해부학 (1건)
INSERT INTO public.subjects (id, name, description, icon, phase, order_index, is_active, created_at, category_id, event)
VALUES ('7538c34d-5b36-4955-91fd-3f7fe4e7f244', '필라테스 해부학', 'IIPA 필라테스 지도자 자격증 필기시험 과목', '🦴', 'mvp', 1, TRUE, '2026-06-29T16:34:58.936542+00:00', '410d8994-8574-448a-9a6e-1c383bb2a009', 'iipa-pilates');

-- 5. certification_subjects — Lv1 ↔ 해부학 (1건)
INSERT INTO public.certification_subjects (id, certification_id, subject_id, is_required, display_order)
VALUES ('74d0f050-0fef-4050-bee7-6c46a4fa1cff', 'e52ea177-15cd-4a92-b624-391e69c160cb', '7538c34d-5b36-4955-91fd-3f7fe4e7f244', TRUE, 1);

-- 6. courses — 해부학 기초 (1건)
INSERT INTO public.courses (id, title, description, category, phase, level, xp_reward, order_index, is_locked, unlock_condition, thumbnail_url, created_at, subject_id, certification_id)
VALUES ('aa4aa3a2-dbf0-4dc0-bc41-a6764440e2b1', '해부학 기초', '해부학적 자세, 면과 축, 방향 용어, 관절 움직임 용어를 학습합니다.', 'iipa_anatomy', 'phase2', NULL, 10, 1, FALSE, NULL, NULL, '2026-07-01T14:56:58.997303+00:00', '7538c34d-5b36-4955-91fd-3f7fe4e7f244', 'e52ea177-15cd-4a92-b624-391e69c160cb');

-- 7. course_certifications — 해부학기초 ↔ Lv1 (1건)
INSERT INTO public.course_certifications (id, course_id, certification_id, created_at)
VALUES ('10c33a3f-b3ec-45ff-8a6a-90be2cb47265', 'aa4aa3a2-dbf0-4dc0-bc41-a6764440e2b1', 'e52ea177-15cd-4a92-b624-391e69c160cb', '2026-07-03T05:42:23.042561+00:00');

-- 8. chapters — 해부학적 자세와 기본 자세 (1건)
INSERT INTO public.chapters (id, course_id, title, description, order_index, is_active, created_at, video_url, audio_url, image_url, content_type, year_tags, frequency_score, content_json)
VALUES ('46765992-863d-4509-b773-c25d5595c18f', 'aa4aa3a2-dbf0-4dc0-bc41-a6764440e2b1', '해부학적 자세와 기본 자세', NULL, 1, TRUE, '2026-07-01T14:56:58.997303+00:00', NULL, NULL, NULL, 'image_slide', '{}'::text[], 0, NULL);

-- 9. chapter_cards 1패스 — 카드 전부 INSERT (linked_quiz_id는 NULL, self-FK 회피) (9건)
INSERT INTO public.chapter_cards (id, chapter_id, question, options, explanation, order_index, created_at, image_url, image_caption, image_source, reference_text, exam_years, star_rating, key_points, content_type, question_format, difficulty, answer_index, linked_quiz_id)
VALUES ('ea627362-cc6a-4f7f-8e9b-23a364c0d612', '46765992-863d-4509-b773-c25d5595c18f', '해부학적 자세 (Anatomical Position)란?', '[]'::jsonb, '해부학적 자세(Anatomical Position)는 인체의 위치와 방향을 설명하기 위해 전 세계 의료·운동과학 분야가 공통으로 사용하는 표준 기준 자세입니다. 이 자세를 기준으로 삼아야 ''위/아래'', ''안쪽/바깥쪽'' 같은 방향 용어와 관절의 움직임을 누구나 같은 의미로 이해할 수 있습니다.

해부학적 자세는 다음 다섯 가지 조건을 모두 만족해야 합니다.

1. 몸을 똑바로 세운 직립 자세를 취합니다.
2. 시선은 정면을 바라봅니다.
3. 양팔은 몸통 옆에 자연스럽게 늘어뜨립니다.
4. 손바닥은 앞(전방)을 향하게 합니다.
5. 양 발은 약간 벌려 서로 평행하게 놓습니다.

이 중에서도 특히 주의해야 할 부분은 손바닥의 방향입니다. 팔을 그냥 몸 옆으로 자연스럽게 늘어뜨리면 손바닥은 보통 몸쪽을 향하게 되는데, 해부학적 자세에서는 전완(forearm)이 바깥쪽으로 살짝 돌아간 회외(supination) 상태를 기준으로 삼기 때문에 손바닥이 반드시 앞을 향해야 합니다. 만약 손바닥이 뒤나 옆을 향하고 있다면 그 자세는 해부학적 자세가 아닙니다.

이 기준은 실제 임상과 지도 현장에서도 그대로 쓰입니다. 예를 들어 회원의 좌우를 이야기할 때는 항상 회원 자신을 기준으로 한 오른쪽·왼쪽을 말하며, 필라테스 큐잉에서 ''안쪽(medial)''이나 ''바깥쪽(lateral)'' 같은 표현을 쓸 때도 이 해부학적 자세를 기준점으로 삼아 방향을 판단합니다.', 1, '2026-07-01T14:56:58.997303+00:00', 'https://sbketzgadjvzedbayesc.supabase.co/storage/v1/object/public/content-images/iipa/anatomy/p3.png', NULL, NULL, NULL, NULL, 1, '["해부학적 자세는 직립·정면 주시·양팔을 몸통 옆에·손바닥 전방·양 발 평행의 5가지 조건을 모두 갖춘 자세다","손바닥이 앞을 향하는 것은 전완의 회외 상태를 기준으로 삼기 때문이며, 몸쪽이나 뒤를 향하면 해부학적 자세가 아니다","모든 방향 용어(medial/lateral 등)와 움직임 설명은 이 자세를 기준으로 한다"]'::jsonb, 'lesson', NULL, 1, NULL, NULL);
INSERT INTO public.chapter_cards (id, chapter_id, question, options, explanation, order_index, created_at, image_url, image_caption, image_source, reference_text, exam_years, star_rating, key_points, content_type, question_format, difficulty, answer_index, linked_quiz_id)
VALUES ('9254058f-7edd-4935-bf9f-c028508de574', '46765992-863d-4509-b773-c25d5595c18f', '운동 기본 자세의 종류', '[]'::jsonb, '필라테스와 운동 지도 현장에서는 몇 가지 기본 자세를 정해진 이름으로 부르며, 이 이름들을 정확히 구분해서 쓰는 것이 큐잉의 기본입니다.

1. Supine position(앙와위, 바로 누운 자세): 등을 바닥에 대고 위를 보고 눕는 자세입니다.
2. Prone position(복와위, 엎드린 자세): 배를 바닥에 대고 엎드리는 자세입니다.
3. Side-lying position(측와위, 옆으로 누운 자세): 몸의 한쪽 면을 바닥에 대고 옆으로 눕는 자세입니다.
4. Quadruped position(네발기기 자세): 양손과 양 무릎, 네 지점으로 바닥을 짚는 자세입니다.
5. Kneeling position(무릎 꿇기 자세): 양 무릎으로 바닥을 짚고 상체는 곧게 세우는 자세입니다.
6. Standing position(기립 자세): 두 발로 서 있는 자세입니다.

이 중 Quadruped와 Kneeling은 이름이 비슷해 보이지만 실제로는 지지하는 지점 수가 다릅니다. Quadruped는 양손과 양 무릎, 총 네 지점으로 바닥을 짚는 반면 Kneeling은 양 무릎 두 지점만으로 지지하면서 상체를 곧게 세웁니다. 한쪽 무릎만 바닥에 대는 자세는 따로 Half-kneeling이라고 부릅니다.

각 자세에서 관절이 어떤 위치에 놓이는지도 함께 알아두면 동작을 분석할 때 도움이 됩니다. 예를 들어 Quadruped에서는 고관절과 슬관절이 모두 약 90도 굴곡된 상태이고, Kneeling에서는 고관절이 중립에서 약간 신전된 상태에 가깝습니다. Supine에서는 특별히 힘을 주지 않는 한 모든 관절이 중립 위치에 놓입니다.

자격시험에서는 사진 속 자세를 보고 정확한 명칭을 구분해내는 문제가 자주 출제되므로, 이름과 실제 자세를 짝지어 기억해두는 것이 중요합니다.', 2, '2026-07-01T14:56:58.997303+00:00', 'https://sbketzgadjvzedbayesc.supabase.co/storage/v1/object/public/content-images/iipa/anatomy/p8.png', NULL, NULL, NULL, NULL, 1, '["Supine(바로 누운), Prone(엎드린), Side-lying(옆으로 누운), Quadruped(네발기기), Kneeling(무릎 꿇기), Standing(기립)의 6가지 기본 자세를 구분한다","Quadruped는 양손+양무릎 네 지점 지지, Kneeling은 양무릎 두 지점 지지로 상체를 세운 자세다","Quadruped와 Kneeling에서는 고관절·슬관절의 각도가 다르므로 자세 이름과 관절 위치를 함께 기억한다"]'::jsonb, 'lesson', NULL, 1, NULL, NULL);
INSERT INTO public.chapter_cards (id, chapter_id, question, options, explanation, order_index, created_at, image_url, image_caption, image_source, reference_text, exam_years, star_rating, key_points, content_type, question_format, difficulty, answer_index, linked_quiz_id)
VALUES ('66a9092b-9cbc-4eff-9d94-db95e26783e1', '46765992-863d-4509-b773-c25d5595c18f', '자세에 따른 관절 움직임 분석', '[]'::jsonb, '운동 자세를 정확히 분석하려면 그 자세에서 각 관절이 어떤 상태에 놓여 있는지를 하나씩 짚어낼 수 있어야 합니다. 이것이 동작 분석(Movement analysis)의 기초입니다.

예를 들어 Quadruped position(네발기기 자세)에서는 여러 관절이 동시에 특정 각도를 이루고 있습니다. 견관절(어깨)은 팔이 바닥을 짚기 위해 몸통에서 앞으로 약 90도 굴곡되어 있고, 주관절(팔꿈치)은 몸을 지탱하기 위해 곧게 펴진 신전 상태입니다. 아래쪽으로는 고관절과 슬관절이 각각 약 90도씩 굴곡되어 몸통과 허벅지, 허벅지와 정강이가 서로 직각에 가깝게 접혀 있습니다.

반면 Kneeling position(무릎 꿇기 자세)에서는 고관절이 중립에서 약간 신전된 상태이고, 슬관절은 완전히 굴곡되어 있으며, 발목은 발끝이 아래로 향한 저측굴곡 상태가 됩니다.

동작을 분석해서 기록할 때는 ''어떤 관절이 어떤 움직임 상태인지''를 짝지어 표현하는 습관이 중요합니다. 예를 들어 ''오른쪽 고관절 굴곡''처럼 방향과 관절명, 움직임을 함께 적어야 정확한 분석이 됩니다.

실제로는 하나의 동작 안에서 여러 관절의 움직임이 동시에 일어나는 경우가 대부분입니다. 런지(Lunge) 동작을 예로 들면, 앞다리는 고관절과 슬관절이 함께 굴곡되고 뒷다리는 고관절이 신전되면서 발목이 배측굴곡되는 등, 여러 관절의 움직임이 한 번에 조합되어 나타납니다. 이런 식으로 자세 하나를 여러 관절의 조합으로 나누어 보는 연습이 실기시험 대비에도 그대로 활용됩니다.', 3, '2026-07-01T14:56:58.997303+00:00', 'https://sbketzgadjvzedbayesc.supabase.co/storage/v1/object/public/content-images/iipa/anatomy/p8.png', NULL, NULL, NULL, NULL, 1, '["동작 분석은 자세 안에서 각 관절이 어떤 움직임 상태에 있는지 하나씩 짚어내는 것이다","Quadruped는 견관절 굴곡, 주관절 신전, 고관절 굴곡, 슬관절 굴곡이 함께 나타나는 자세다","분석 기록은 관절명과 움직임을 짝지어 표현한다(예: 고관절 굴곡)","하나의 동작에는 여러 관절의 움직임이 동시에 조합되어 나타난다(예: 런지)"]'::jsonb, 'lesson', NULL, 2, NULL, NULL);
INSERT INTO public.chapter_cards (id, chapter_id, question, options, explanation, order_index, created_at, image_url, image_caption, image_source, reference_text, exam_years, star_rating, key_points, content_type, question_format, difficulty, answer_index, linked_quiz_id)
VALUES ('c1db5d69-3d46-475f-b0e3-5ea56102f214', '46765992-863d-4509-b773-c25d5595c18f', '해부학적 자세에서 손바닥은 몸의 앞쪽(전방)을 향한다.', '["O","X"]'::jsonb, '해부학적 자세에서 손바닥은 반드시 앞(전방)을 향합니다. 이는 전완의 회외(supination) 상태를 기준으로 잡기 위함입니다. 일상에서 팔을 자연스럽게 내리면 손바닥이 몸쪽을 향하지만, 해부학적 자세에서는 앞을 향해야 합니다.', 4, '2026-07-01T14:56:58.997303+00:00', 'https://sbketzgadjvzedbayesc.supabase.co/storage/v1/object/public/content-images/iipa/anatomy/p3.png', NULL, NULL, NULL, NULL, 1, '[]'::jsonb, 'quiz', 'true_false', 1, '[0]'::jsonb, NULL);
INSERT INTO public.chapter_cards (id, chapter_id, question, options, explanation, order_index, created_at, image_url, image_caption, image_source, reference_text, exam_years, star_rating, key_points, content_type, question_format, difficulty, answer_index, linked_quiz_id)
VALUES ('33cfc93d-9bc3-4dfb-ab5b-b5edbf4070df', '46765992-863d-4509-b773-c25d5595c18f', 'Quadruped position(네발기기 자세)에서 고관절은 신전(Extension) 상태이다.', '["O","X"]'::jsonb, 'Quadruped position에서 고관절은 약 90° 굴곡(Flexion) 상태입니다. 엉덩이가 무릎 위에 위치하므로 고관절이 접혀 있는 상태입니다. 신전(Extension)은 고관절이 펴지는 것으로, Kneeling이나 Standing 자세에서의 상태입니다.', 5, '2026-07-01T14:56:58.997303+00:00', 'https://sbketzgadjvzedbayesc.supabase.co/storage/v1/object/public/content-images/iipa/anatomy/p8.png', NULL, NULL, NULL, '["기출1","기출2"]'::jsonb, 5, '[]'::jsonb, 'quiz', 'true_false', 1, '[1]'::jsonb, NULL);
INSERT INTO public.chapter_cards (id, chapter_id, question, options, explanation, order_index, created_at, image_url, image_caption, image_source, reference_text, exam_years, star_rating, key_points, content_type, question_format, difficulty, answer_index, linked_quiz_id)
VALUES ('a90d1bb7-b052-4e17-8bc3-45944c18a958', '46765992-863d-4509-b773-c25d5595c18f', '다음 중 해부학적 자세에 대한 설명으로 올바른 것은?', '["직립 자세에서 양팔을 들어올린 상태","직립 자세에서 손바닥이 뒤(후방)를 향한 상태","직립 자세에서 손바닥이 앞(전방)을 향하고, 양팔은 몸통 옆에 위치","직립 자세에서 양팔을 가슴 앞에 교차한 상태"]'::jsonb, '해부학적 자세는 직립, 정면 주시, 양팔은 몸통 옆에 자연스럽게 내리고, 손바닥은 앞(전방)을 향하며, 양 발은 약간 벌려 평행하게 놓은 자세입니다.', 6, '2026-07-01T14:56:58.997303+00:00', 'https://sbketzgadjvzedbayesc.supabase.co/storage/v1/object/public/content-images/iipa/anatomy/p3.png', NULL, NULL, NULL, NULL, 1, '[]'::jsonb, 'quiz', 'multiple_choice', 1, '[2]'::jsonb, NULL);
INSERT INTO public.chapter_cards (id, chapter_id, question, options, explanation, order_index, created_at, image_url, image_caption, image_source, reference_text, exam_years, star_rating, key_points, content_type, question_format, difficulty, answer_index, linked_quiz_id)
VALUES ('48b4130b-f574-4276-b36c-edeb4c4a7d9f', '46765992-863d-4509-b773-c25d5595c18f', '해부학적 자세(Anatomical Position)에 대한 설명으로 옳은 것을 모두 포함한 보기는?', '["똑바로 서서 정면을 보고, 손바닥은 앞을 향하며, 양 발은 약간 벌린다","똑바로 서서 정면을 보고, 손바닥은 몸쪽을 향하며, 양 발은 모은다","똑바로 서서 정면을 보고, 손바닥은 뒤를 향하며, 양 발은 약간 벌린다","똑바로 서서 옆을 보고, 손바닥은 앞을 향하며, 양 발은 약간 벌린다"]'::jsonb, '해부학적 자세는 몸을 곧게 세우고 정면을 바라보며, 양팔은 몸통 옆에 자연스럽게 내리고, 손바닥은 앞을 향하며, 양 발은 살짝 벌려 평행하게 놓는 자세입니다. 보기 중 손바닥이 몸쪽을 향하거나 뒤를 향한다고 설명하는 것, 그리고 정면이 아닌 옆을 본다고 설명하는 것은 모두 이 조건에서 벗어나므로 오답입니다.', 7, '2026-07-01T14:56:58.997303+00:00', 'https://sbketzgadjvzedbayesc.supabase.co/storage/v1/object/public/content-images/iipa/anatomy/p3.png', NULL, NULL, NULL, NULL, 1, '[]'::jsonb, 'exam', 'multiple_choice', 1, '[0]'::jsonb, NULL);
INSERT INTO public.chapter_cards (id, chapter_id, question, options, explanation, order_index, created_at, image_url, image_caption, image_source, reference_text, exam_years, star_rating, key_points, content_type, question_format, difficulty, answer_index, linked_quiz_id)
VALUES ('75c325d6-0740-452a-9050-1bf653b4d81c', '46765992-863d-4509-b773-c25d5595c18f', '다음은 어떤 자세이며, 고관절(Hip)의 움직임은 무엇인가?', '["Quadruped position (네발기기자세), Flexion (굴곡)","Kneeling position (무릎꿇기자세), Flexion (굴곡)","Quadruped position (네발기기자세), Extension (신전)","Kneeling position (무릎꿇기자세), Extension (신전)"]'::jsonb, '이미지에서 양 손과 양 무릎이 바닥에 있으므로 Quadruped position(네발기기 자세)입니다. 이 자세에서 고관절은 약 90° 굴곡(Flexion) 상태입니다. Kneeling은 무릎만 바닥에 닿고 상체가 직립한 자세입니다.', 8, '2026-07-01T14:56:58.997303+00:00', 'https://sbketzgadjvzedbayesc.supabase.co/storage/v1/object/public/content-images/iipa/anatomy/p8.png', NULL, NULL, NULL, NULL, 1, '[]'::jsonb, 'exam', 'multiple_choice', 2, '[0]'::jsonb, NULL);
INSERT INTO public.chapter_cards (id, chapter_id, question, options, explanation, order_index, created_at, image_url, image_caption, image_source, reference_text, exam_years, star_rating, key_points, content_type, question_format, difficulty, answer_index, linked_quiz_id)
VALUES ('6d1081ec-5dd0-45a5-a473-cac7316bdc24', '46765992-863d-4509-b773-c25d5595c18f', '다음 중 Prone position(복와위)에 대한 설명으로 올바른 것은?', '["등을 바닥에 대고 바로 누운 자세","배를 바닥에 대고 엎드린 자세","옆으로 누운 자세","무릎을 꿇고 앉은 자세"]'::jsonb, 'Prone = 엎드린(복와위). Supine = 바로 누운(앙와위). Side-lying = 옆으로 누운(측와위). Kneeling = 무릎 꿇기.', 9, '2026-07-01T14:56:58.997303+00:00', 'https://sbketzgadjvzedbayesc.supabase.co/storage/v1/object/public/content-images/iipa/anatomy/p7.png', NULL, NULL, NULL, '["기출1","기출2"]'::jsonb, 5, '[]'::jsonb, 'exam', 'multiple_choice', 1, '[1]'::jsonb, NULL);

-- 10. chapter_cards 2패스 — linked_quiz_id 실제값 복원 (3건)
UPDATE public.chapter_cards SET linked_quiz_id = 'c1db5d69-3d46-475f-b0e3-5ea56102f214' WHERE id = 'ea627362-cc6a-4f7f-8e9b-23a364c0d612';
UPDATE public.chapter_cards SET linked_quiz_id = '6d1081ec-5dd0-45a5-a473-cac7316bdc24' WHERE id = '9254058f-7edd-4935-bf9f-c028508de574';
UPDATE public.chapter_cards SET linked_quiz_id = '75c325d6-0740-452a-9050-1bf653b4d81c' WHERE id = '66a9092b-9cbc-4eff-9d94-db95e26783e1';

COMMIT;

-- ============================================================================
-- 실행 후 검증용 (주석 — 필요 시 해제해서 dev에서 실행)
-- ============================================================================
-- SELECT count(*) FROM public.partners             WHERE id = '2c21899f-3c40-41af-9051-f7f8a2fb71ac';               -- 기대 1
-- SELECT count(*) FROM public.categories           WHERE id = '410d8994-8574-448a-9a6e-1c383bb2a009';               -- 기대 1
-- SELECT count(*) FROM public.certifications       WHERE id = 'e52ea177-15cd-4a92-b624-391e69c160cb';                    -- 기대 1
-- SELECT count(*) FROM public.subjects             WHERE id = '7538c34d-5b36-4955-91fd-3f7fe4e7f244';                -- 기대 1
-- SELECT count(*) FROM public.certification_subjects WHERE certification_id='e52ea177-15cd-4a92-b624-391e69c160cb' AND subject_id='7538c34d-5b36-4955-91fd-3f7fe4e7f244'; -- 기대 1
-- SELECT count(*) FROM public.courses              WHERE id = 'aa4aa3a2-dbf0-4dc0-bc41-a6764440e2b1';                 -- 기대 1
-- SELECT count(*) FROM public.course_certifications WHERE course_id='aa4aa3a2-dbf0-4dc0-bc41-a6764440e2b1';           -- 기대 1
-- SELECT count(*) FROM public.chapters             WHERE id = '46765992-863d-4509-b773-c25d5595c18f';                -- 기대 1
-- SELECT count(*) FROM public.chapter_cards        WHERE chapter_id = '46765992-863d-4509-b773-c25d5595c18f';        -- 기대 9
-- SELECT count(*) FROM public.chapter_cards        WHERE chapter_id = '46765992-863d-4509-b773-c25d5595c18f' AND linked_quiz_id IS NOT NULL; -- 기대 3
