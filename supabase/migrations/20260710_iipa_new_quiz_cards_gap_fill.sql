-- ================================================================
-- IIPA 신규 quiz 카드 15건 삽입 (문제은행 부족 12개 lesson에 대한 보강)
--
-- 출처: docs/new_quiz_cards_for_gaps.json (PM/콘텐츠 프로젝트 제공)
-- 대상 lesson 매핑: for_lesson의 Cn_CHm 코드를 실제 courses.order_index /
-- chapters.order_index 와 대조해 chapter_id + 삽입 위치(해당 lesson 바로
-- 다음 order_index) 확정. 특히 슬와근(C6_CH3_L03), 광배근(U7_CH3 내
-- "견갑대·상완 근육 촉지" lesson) 배치는 실제 chapter_cards 데이터 대조로
-- 검증 완료.
--
-- 컬럼은 PostgREST OpenAPI 스키마(GET /rest/v1/)로 재확인함:
--   chapter_cards.id = uuid, PK, default gen_random_uuid() (여기서는 클라이언트에서 생성)
--   chapter_cards.order_index = integer, default 0
--   chapter_cards.options/answer_index/key_points = jsonb
--
-- 주의: 이 마이그레이션은 2026-07-10 Claude Code가 Supabase REST API로
-- 이미 실행 완료함 (사용자가 "Claude Code가 직접 INSERT"를 명시적으로
-- 요청 -- ALTER TABLE 등 스키마 DDL이 아닌 데이터 INSERT/UPDATE이므로
-- SQL Editor 수동 실행 절차 대상 아님). 이 파일은 변경 이력 기록용이며,
-- 실제 DB에 이미 반영된 상태와 100% 동일한 내용이다. 재실행 금지
-- (이미 존재하는 id로 INSERT 시도 시 PK 충돌 발생).
-- ================================================================

BEGIN;

-- -- 챕터: 근육 촉지 (U7_CH3) (2c706fff-8a74-4170-9f88-da6b5a283e87) --
UPDATE chapter_cards SET order_index = 17 WHERE id = '6f6f82eb-ee8a-4f0f-8ca8-75f2d708c05f';
UPDATE chapter_cards SET order_index = 16 WHERE id = 'eb435a6c-123f-4b11-a911-deede4f74fec';
UPDATE chapter_cards SET order_index = 15 WHERE id = '4faf03da-10d5-4a29-9316-a52a317a8e51';
UPDATE chapter_cards SET order_index = 14 WHERE id = '92bd68a0-760e-48e4-a268-07ca6eb88d40';
UPDATE chapter_cards SET order_index = 13 WHERE id = 'b22ca435-030a-4490-bce9-c08db46c4127';
UPDATE chapter_cards SET order_index = 12 WHERE id = '506d2411-0c77-423b-8409-fe01bd16144d';
UPDATE chapter_cards SET order_index = 11 WHERE id = '815f4ac6-3d40-453b-9b4b-39999f6e4f53';
UPDATE chapter_cards SET order_index = 10 WHERE id = '33fe9ba6-00d1-4efe-b698-54f2d20af906';
UPDATE chapter_cards SET order_index = 9 WHERE id = 'd62496f9-b48f-41ec-99e8-7f9f2454501b';
UPDATE chapter_cards SET order_index = 8 WHERE id = '214b6381-910b-4150-acb2-c9ffa399bbd9';
UPDATE chapter_cards SET order_index = 7 WHERE id = 'ba86e4f5-676f-45e3-acce-3023206412cf';
UPDATE chapter_cards SET order_index = 4 WHERE id = '32ba5c39-41f2-4021-be50-74263b09f938';
INSERT INTO chapter_cards (id, chapter_id, content_type, question_format, difficulty, question, options, answer_index, explanation, key_points, order_index, image_url)
VALUES ('2e0c267f-fc13-4705-aeac-a6437f808f54', '2c706fff-8a74-4170-9f88-da6b5a283e87', 'quiz', 'true_false', 1, '복직근을 촉지할 때는 크런치처럼 몸통을 굴곡시키는 동작으로 수축을 확인한다.', '["O","X"]'::jsonb, '[0]'::jsonb, '복직근은 배 앞쪽 정중선 양옆에서 만져지는 세로 근육으로, 크런치처럼 몸통을 굴곡시키는 동작을 시키면서 그 아래 근육이 단단해지는 것을 확인합니다.', '[]'::jsonb, 2, NULL); -- U7_CH3_Q_NEW01
INSERT INTO chapter_cards (id, chapter_id, content_type, question_format, difficulty, question, options, answer_index, explanation, key_points, order_index, image_url)
VALUES ('5b00c25b-a418-4ca6-8717-709c945ac4dc', '2c706fff-8a74-4170-9f88-da6b5a283e87', 'quiz', 'multiple_choice', 2, '몸통 근육 촉지 시, 외복사근의 수축을 확인하기 위한 동작으로 올바른 것은?', '["몸통을 반대쪽으로 회전시킨다","몸통을 굴곡시킨다","견갑골을 거상시킨다","고관절을 신전시킨다"]'::jsonb, '[0]'::jsonb, '외복사근은 옆구리에서 대각선 방향으로 만져지는 근육으로, 몸통을 반대쪽으로 회전시키는 동작을 통해 수축을 확인합니다. 복직근은 몸통 굴곡, 승모근은 견갑골 거상 동작으로 각각 확인합니다.', '[]'::jsonb, 3, NULL); -- U7_CH3_Q_NEW02
INSERT INTO chapter_cards (id, chapter_id, content_type, question_format, difficulty, question, options, answer_index, explanation, key_points, order_index, image_url)
VALUES ('b5fc77f9-2cf2-474a-9e12-9732e3bcfcae', '2c706fff-8a74-4170-9f88-da6b5a283e87', 'quiz', 'true_false', 1, '광배근을 촉지할 때는 팔을 아래로 당기는 어깨관절 신전·내전 동작에서 수축을 확인한다.', '["O","X"]'::jsonb, '[0]'::jsonb, '광배근은 등 옆면에 넓게 퍼져 있는 근육으로, 팔을 아래로 당기는 동작인 어깨관절 신전과 내전 시 수축이 확인됩니다.', '[]'::jsonb, 5, NULL); -- U7_CH3_Q_NEW03
INSERT INTO chapter_cards (id, chapter_id, content_type, question_format, difficulty, question, options, answer_index, explanation, key_points, order_index, image_url)
VALUES ('5102735c-a7f2-4c60-8f96-f626c75aba25', '2c706fff-8a74-4170-9f88-da6b5a283e87', 'quiz', 'multiple_choice', 1, '상완이두근과 상완삼두근의 촉지 방법으로 올바른 것은?', '["팔꿈치를 굽히면 삼두근이, 펴면 이두근이 단단해진다","팔꿈치를 굽히면 이두근이, 펴면 삼두근이 단단해진다","두 근육 모두 팔꿈치를 굽힐 때만 단단해진다","두 근육 모두 어깨를 돌릴 때 단단해진다"]'::jsonb, '[1]'::jsonb, '상완이두근은 팔꿈치를 굽힐 때, 상완삼두근은 팔꿈치를 펼 때 각각 단단해지므로, 두 동작을 번갈아 하며 대비해서 촉지하면 구분하기 쉽습니다.', '[]'::jsonb, 6, NULL); -- U7_CH3_Q_NEW04

-- -- 챕터: 햄스트링과 하퇴 근육 (C6_CH3) (8d123e29-7999-4833-b497-854816841e9f) --
UPDATE chapter_cards SET order_index = 7 WHERE id = '9472330b-9190-49be-a282-aa8948b12073';
UPDATE chapter_cards SET order_index = 6 WHERE id = '7cbf5f6c-45ef-44ec-abaf-55a75c8ffab3';
UPDATE chapter_cards SET order_index = 5 WHERE id = '8dbfa52a-327d-4477-9104-3152bc662d1d';
INSERT INTO chapter_cards (id, chapter_id, content_type, question_format, difficulty, question, options, answer_index, explanation, key_points, order_index, image_url)
VALUES ('617a6a12-8f72-4ba2-8b62-0ba3b0c957d5', '8d123e29-7999-4833-b497-854816841e9f', 'quiz', 'true_false', 2, '슬와근(Popliteus)은 무릎을 펴는 슬관절 신전을 주로 담당하는 근육이다.', '["O","X"]'::jsonb, '[1]'::jsonb, '슬와근은 무릎 신전을 만드는 근육이 아니라, 완전히 편 무릎의 잠김을 풀어 슬관절 굴곡이 시작되도록 돕는 근육입니다. 무릎을 굽히는 힘을 크게 내는 근육이라기보다 굴곡의 시작 스위치 역할을 합니다.', '[]'::jsonb, 4, NULL); -- C6_CH3_Q_NEW01

-- -- 챕터: 회전근개와 삼각근 (C5_CH2) (3de3cfeb-6c18-4fb6-bff8-600035cba11b) --
UPDATE chapter_cards SET order_index = 7 WHERE id = '23b178eb-b2f7-44e9-9be4-9abc26a13d9b';
UPDATE chapter_cards SET order_index = 6 WHERE id = 'afbbbd47-2ed9-4ea5-985e-18bae7f4a5f9';
UPDATE chapter_cards SET order_index = 5 WHERE id = '8458aa5a-5445-444d-8d00-29ab56039928';
UPDATE chapter_cards SET order_index = 4 WHERE id = '56388e09-e4e8-4b50-933e-1b4791387263';
INSERT INTO chapter_cards (id, chapter_id, content_type, question_format, difficulty, question, options, answer_index, explanation, key_points, order_index, image_url)
VALUES ('69029760-23d4-4bc5-a356-daac3f09ee11', '3de3cfeb-6c18-4fb6-bff8-600035cba11b', 'quiz', 'multiple_choice', 1, '삼각근(Deltoid) 중면의 주된 작용은?', '["견관절 굴곡","견관절 외전","견관절 신전","견관절 수평내전"]'::jsonb, '[1]'::jsonb, '삼각근 중면은 견봉 바깥쪽에서 시작해 팔을 옆으로 들어 올리는 견관절 외전을 주로 담당합니다. 전면은 굴곡·내회전·수평내전을, 후면은 신전·외회전·수평외전을 만듭니다.', '[]'::jsonb, 3, NULL); -- C5_CH2_Q_NEW01

-- -- 챕터: 대흉근, 광배근, 대원근 (C5_CH3) (58d61afd-fff4-4d29-a0a1-66b26817b5f6) --
UPDATE chapter_cards SET order_index = 5 WHERE id = '793be6d8-cc65-4c2d-811f-12ca616d763b';
UPDATE chapter_cards SET order_index = 4 WHERE id = '50d74787-8e0f-4ebb-849d-05006bd901b2';
INSERT INTO chapter_cards (id, chapter_id, content_type, question_format, difficulty, question, options, answer_index, explanation, key_points, order_index, image_url)
VALUES ('e14b5ee5-7732-457e-8e90-57317acae5dd', '58d61afd-fff4-4d29-a0a1-66b26817b5f6', 'quiz', 'true_false', 2, '대흉근(Pectoralis major)의 작용에는 견관절 외전(Abduction)이 포함된다.', '["O","X"]'::jsonb, '[1]'::jsonb, '대흉근의 작용은 견관절 내회전, 내전, 수평내전입니다. 외전(Abduction)은 대흉근이 아니라 삼각근 중면과 극상근이 담당하는 움직임입니다.', '[]'::jsonb, 3, NULL); -- C5_CH3_Q_NEW01

-- -- 챕터: 척추 (C2_CH2) (6c82a7ff-9762-4e62-85b3-fb6848e9a900) --
UPDATE chapter_cards SET order_index = 9 WHERE id = '7435dfcc-58bd-45ff-bd83-80c864601860';
UPDATE chapter_cards SET order_index = 8 WHERE id = '684b88f0-b1bb-4975-bc6c-8a07b7d55f68';
UPDATE chapter_cards SET order_index = 7 WHERE id = '177fda4f-0fd8-49ea-a053-2dd4538fc325';
UPDATE chapter_cards SET order_index = 6 WHERE id = '8bdc7355-5097-4170-8d2c-b4d723f0dfc1';
UPDATE chapter_cards SET order_index = 5 WHERE id = 'aa679129-a4be-46d9-aa03-67c8d395cca2';
INSERT INTO chapter_cards (id, chapter_id, content_type, question_format, difficulty, question, options, answer_index, explanation, key_points, order_index, image_url)
VALUES ('e0db6c13-54a8-4abf-a8b8-2b81434a1f18', '6c82a7ff-9762-4e62-85b3-fb6848e9a900', 'quiz', 'multiple_choice', 2, '고개를 좌우로 돌리는 회전 움직임 대부분이 일어나는 관절은?', '["경추 6-7번 사이 관절","환축추관절 (Atlas-Axis)","흉추-경추 경계 관절","환추-후두골 관절"]'::jsonb, '[1]'::jsonb, '경추 2번(Axis)의 치돌기를 축으로 경추 1번(Atlas)이 회전하면서 고개의 좌우 회전 움직임 대부분이 일어납니다. 환추-후두골 관절은 고개를 끄덕이는 굴곡·신전을 담당합니다.', '[]'::jsonb, 4, NULL); -- C2_CH2_Q_NEW01

-- -- 챕터: 견갑골 근육 (C5_CH1) (b67ae8e9-5ffc-4319-85b9-a6ad41a509a8) --
UPDATE chapter_cards SET order_index = 6 WHERE id = 'd03c61b0-49d0-4847-9165-a7edebeeb6bb';
UPDATE chapter_cards SET order_index = 5 WHERE id = 'a437cfaf-916e-4fff-8b76-2a6f447c9edf';
UPDATE chapter_cards SET order_index = 4 WHERE id = '6a1729d4-a9c4-40f1-8156-f4820e2424e6';
UPDATE chapter_cards SET order_index = 3 WHERE id = '5b9b178e-fdb3-471b-a729-31a9bf49c7be';
INSERT INTO chapter_cards (id, chapter_id, content_type, question_format, difficulty, question, options, answer_index, explanation, key_points, order_index, image_url)
VALUES ('d28898b9-f3f0-4163-904d-a958cb1797b5', 'b67ae8e9-5ffc-4319-85b9-a6ad41a509a8', 'quiz', 'multiple_choice', 1, '상부 승모근의 작용으로 올바른 것은?', '["견갑골 하강, 하방회전","견갑골 후인, 상방회전","견갑골 거상, 상방회전","견갑골 전인, 하방회전"]'::jsonb, '[2]'::jsonb, '상부 승모근은 견갑골 거상과 상방회전을 만듭니다. 중부 승모근은 후인+상방회전을, 하부 승모근은 하강+상방회전을 담당합니다.', '[]'::jsonb, 2, NULL); -- C5_CH1_Q_NEW01

-- -- 챕터: 뼈 촉지 (U7_CH2) (bf9d8772-509d-41f0-95bf-d897c508aa27) --
UPDATE chapter_cards SET order_index = 13 WHERE id = '6527dd99-a836-4ac2-af24-051895a9207b';
UPDATE chapter_cards SET order_index = 12 WHERE id = '52d7bf62-cebc-4aaa-8652-8a210f51c37b';
UPDATE chapter_cards SET order_index = 11 WHERE id = 'd9033f96-ff8a-48b2-bd29-32d54fe7e291';
UPDATE chapter_cards SET order_index = 10 WHERE id = '288c9d0f-4668-47ec-a9e1-2c1dbf92ac5d';
UPDATE chapter_cards SET order_index = 9 WHERE id = 'b53c3570-2826-43ab-a713-9b42e1b88227';
UPDATE chapter_cards SET order_index = 8 WHERE id = 'dfdad503-cb7f-4095-8118-5b6f01957868';
UPDATE chapter_cards SET order_index = 7 WHERE id = 'd9e91e3e-1559-4414-98f2-55f4c6893086';
UPDATE chapter_cards SET order_index = 6 WHERE id = '2441918f-f6b7-4e20-9f90-eee97a3dd87c';
UPDATE chapter_cards SET order_index = 5 WHERE id = 'e08d437d-ba21-4641-bd35-9067b0ee93a6';
UPDATE chapter_cards SET order_index = 4 WHERE id = '391d9ef9-3bb0-484f-8f68-795d1eb93038';
INSERT INTO chapter_cards (id, chapter_id, content_type, question_format, difficulty, question, options, answer_index, explanation, key_points, order_index, image_url)
VALUES ('aff2727c-ed91-4f12-b0f3-faeea427c074', 'bf9d8772-509d-41f0-95bf-d897c508aa27', 'quiz', 'true_false', 2, '오훼돌기(Coracoid process)는 쇄골처럼 피부 바로 아래에서 쉽게 만져지는 랜드마크다.', '["O","X"]'::jsonb, '[1]'::jsonb, '오훼돌기는 쇄골이나 견봉과 달리 표면에서 바로 만져지지 않으며, 쇄골 아래쪽 어깨 앞쪽 안쪽을 깊게 눌러야 확인할 수 있는 랜드마크입니다.', '[]'::jsonb, 2, NULL); -- U7_CH2_Q_NEW01
INSERT INTO chapter_cards (id, chapter_id, content_type, question_format, difficulty, question, options, answer_index, explanation, key_points, order_index, image_url)
VALUES ('613a8495-82d4-4793-a372-90da10b20f45', 'bf9d8772-509d-41f0-95bf-d897c508aa27', 'quiz', 'multiple_choice', 2, '팔을 돌리면서 촉지했을 때 움직임이 함께 느껴지는 상완골 랜드마크는?', '["견봉 (Acromion)","오훼돌기 (Coracoid process)","대결절/소결절 (Greater/Lesser tubercle)","견갑골 내측연"]'::jsonb, '[2]'::jsonb, '상완골의 대결절과 소결절은 팔을 돌리는 동작(회전)에 따라 위치가 함께 움직이므로, 팔을 돌리며 촉지하면 그 움직임을 느낄 수 있습니다. 견봉과 오훼돌기, 견갑골 경계는 팔 회전과 무관하게 고정된 위치에서 촉지됩니다.', '[]'::jsonb, 3, NULL); -- U7_CH2_Q_NEW02

-- -- 챕터: 관절의 기초 (C3_CH1) (d6864af1-47f9-4214-b778-23521da89431) --
UPDATE chapter_cards SET order_index = 7 WHERE id = '79ae07dd-19f8-4b38-8fc1-e35ba633b9a3';
UPDATE chapter_cards SET order_index = 6 WHERE id = '6111f07f-3516-40e0-a3e1-9d883cf11e6e';
UPDATE chapter_cards SET order_index = 5 WHERE id = 'ebc8a69f-ca98-40e9-9366-ef22ab34228a';
INSERT INTO chapter_cards (id, chapter_id, content_type, question_format, difficulty, question, options, answer_index, explanation, key_points, order_index, image_url)
VALUES ('a70314ca-2408-46ad-8cb0-72a3df176e27', 'd6864af1-47f9-4214-b778-23521da89431', 'quiz', 'multiple_choice', 2, '책상 위에서 책을 밀 때처럼 관절면이 서로 미끄러지는 움직임은?', '["구름 (Roll)","미끄러짐 (Slide)","축돌림 (Spin)","전위 (Translation)"]'::jsonb, '[1]'::jsonb, '미끄러짐(Slide, Glide)은 관절면이 서로 미끄러지는 움직임입니다. 구름(Roll)은 바퀴처럼 굴러가는 움직임, 축돌림(Spin)은 팽이처럼 고정된 축을 중심으로 회전하는 움직임입니다.', '[]'::jsonb, 4, NULL); -- C3_CH1_Q_NEW01

-- -- 챕터: 근육의 기초 (C4_CH1) (ea5e91a3-efd9-4a17-aee4-6bbccf9c519f) --
UPDATE chapter_cards SET order_index = 7 WHERE id = 'd2eaf6e3-5b8a-466f-baed-29b6b1d99af8';
UPDATE chapter_cards SET order_index = 6 WHERE id = 'fc2649a4-8f3c-43b1-af4a-db33a72ac49a';
UPDATE chapter_cards SET order_index = 5 WHERE id = '4a94a901-1137-452a-91aa-a7026cc9133b';
UPDATE chapter_cards SET order_index = 4 WHERE id = '4713d50b-2d18-4fdf-b0e1-9a29f1e0baee';
INSERT INTO chapter_cards (id, chapter_id, content_type, question_format, difficulty, question, options, answer_index, explanation, key_points, order_index, image_url)
VALUES ('3a9427a8-dd13-4b28-aff8-456ebe1cb6f9', 'ea5e91a3-efd9-4a17-aee4-6bbccf9c519f', 'quiz', 'true_false', 1, '팔꿈치를 굽힐 때 상완삼두근은 길항근(Antagonist)으로 작용한다.', '["O","X"]'::jsonb, '[0]'::jsonb, '팔꿈치 굴곡에서 주동근(Agonist)은 상완이두근이며, 그 반대 작용을 하는 상완삼두근이 길항근(Antagonist)입니다.', '[]'::jsonb, 3, NULL); -- C4_CH1_Q_NEW01

-- -- 챕터: 해부학적 방향 용어 (C1_CH3) (ee39f006-ac8d-4c44-a1bc-3ae9e0de46f3) --
UPDATE chapter_cards SET order_index = 9 WHERE id = 'ae6bd6ab-ffea-4b1d-8199-4b15e0e50d53';
UPDATE chapter_cards SET order_index = 8 WHERE id = '624ace2e-b046-42ef-906a-67baa5d2cdb0';
UPDATE chapter_cards SET order_index = 7 WHERE id = 'ab45e298-606b-4e80-b11a-a79bc7023037';
UPDATE chapter_cards SET order_index = 6 WHERE id = '686521b1-b59f-48a3-b39a-783a200bf534';
UPDATE chapter_cards SET order_index = 5 WHERE id = '0a1896a6-6406-406a-b11a-0d6f944ee574';
UPDATE chapter_cards SET order_index = 4 WHERE id = '8d337f83-f9b5-4163-8945-755b3479c276';
UPDATE chapter_cards SET order_index = 3 WHERE id = '640fa35f-3c2f-4801-a68a-e4bcb0d64c22';
INSERT INTO chapter_cards (id, chapter_id, content_type, question_format, difficulty, question, options, answer_index, explanation, key_points, order_index, image_url)
VALUES ('80b1d981-d02d-4169-8c3d-97d58bd9dfb0', 'ee39f006-ac8d-4c44-a1bc-3ae9e0de46f3', 'quiz', 'multiple_choice', 1, '머리는 목에 비해 어떤 방향에 위치하는가?', '["Inferior (하방)","Superior (상방)","Posterior (후방)","Medial (내측)"]'::jsonb, '[1]'::jsonb, 'Superior(상방)는 머리 쪽에 더 가까운 위쪽을 의미합니다. 머리는 목보다 Superior에 위치합니다.', '[]'::jsonb, 2, NULL); -- C1_CH3_Q_NEW01

-- -- 챕터: 뼈의 기초와 분류 (C2_CH1) (f26381b9-9bba-4292-9612-2d3918bd642b) --
UPDATE chapter_cards SET order_index = 9 WHERE id = 'd2750d11-04b9-4175-9c30-0bcb0f71e3a2';
UPDATE chapter_cards SET order_index = 8 WHERE id = '24cdc368-a9fc-43a8-a3c7-a165b2400cd3';
UPDATE chapter_cards SET order_index = 7 WHERE id = 'c3e71907-931f-41bd-ab21-b5c063696b49';
UPDATE chapter_cards SET order_index = 6 WHERE id = 'e262e4fc-cfaf-40ac-9dbe-a054086e78db';
UPDATE chapter_cards SET order_index = 5 WHERE id = '1505f2f0-48df-469c-b19c-b4e27703f355';
UPDATE chapter_cards SET order_index = 4 WHERE id = '275f0e91-27f6-4cd6-8414-74c785f2f19b';
UPDATE chapter_cards SET order_index = 3 WHERE id = '30a0a087-3aed-4dfe-9c1a-1344980e1026';
INSERT INTO chapter_cards (id, chapter_id, content_type, question_format, difficulty, question, options, answer_index, explanation, key_points, order_index, image_url)
VALUES ('10750451-4cf2-44e6-ac5a-d6f4c897ba35', 'f26381b9-9bba-4292-9612-2d3918bd642b', 'quiz', 'multiple_choice', 1, '다음 중 뼈의 기능에 해당하지 않는 것은?', '["지지 (Support)","조혈 (Hematopoiesis)","소화 (Digestion)","무기질 저장 (Mineral storage)"]'::jsonb, '[2]'::jsonb, '뼈의 기능은 지지, 보호, 운동, 조혈, 무기질 저장입니다. 소화(Digestion)는 뼈의 기능이 아니라 소화기관의 기능입니다.', '[]'::jsonb, 2, NULL); -- C2_CH1_Q_NEW01

COMMIT;

-- ================================================================
-- 실행 후 확인용 쿼리 (참고, 실행 안 해도 됨)
-- ================================================================
-- SELECT chapter_id, order_index, content_type, question FROM chapter_cards
-- WHERE chapter_id IN ('2c706fff-8a74-4170-9f88-da6b5a283e87', '8d123e29-7999-4833-b497-854816841e9f', '3de3cfeb-6c18-4fb6-bff8-600035cba11b', '58d61afd-fff4-4d29-a0a1-66b26817b5f6', '6c82a7ff-9762-4e62-85b3-fb6848e9a900', 'b67ae8e9-5ffc-4319-85b9-a6ad41a509a8', 'bf9d8772-509d-41f0-95bf-d897c508aa27', 'd6864af1-47f9-4214-b778-23521da89431', 'ea5e91a3-efd9-4a17-aee4-6bbccf9c519f', 'ee39f006-ac8d-4c44-a1bc-3ae9e0de46f3', 'f26381b9-9bba-4292-9612-2d3918bd642b')
-- ORDER BY chapter_id, order_index;
