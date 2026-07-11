-- ================================================================
-- chapter_cards.linked_quiz_id 컬럼 추가 (lesson ↔ quiz 1:1 개념 매칭)
--
-- 목적: 학습카드 3슬라이드 UX의 슬라이드3(미니퀴즈)에서, 챕터 전체
-- exam/quiz 풀에서 순환 배정하는 대신 이 lesson 카드와 정확히 매칭된
-- quiz/exam 카드 하나를 바로 지목해서 보여주기 위함.
--
-- 매칭 출처: docs/mappings-archive/iipa/lesson_quiz_matching.csv
-- (PM 제공, 95개 lesson 중 77개 매칭) + docs/new_quiz_cards_for_gaps.json
-- 15건 INSERT 결과(12개 lesson 신규 매칭) + PM 지정 질문 문구 기반 수동 매칭
-- 6건(question 부분일치로 정확히 1건씩 확인 완료) 을 병합.
-- 병합/중복해소 로직: 기존 CSV 77건은 각 lesson의 매칭 후보 리스트(관련도
-- 순으로 이미 정렬되어 있다고 가정)에서 앞에서부터 아직 다른 lesson에
-- 배정되지 않은 첫 후보를 선택하는 greedy 방식으로 1:1 배정. 나머지 18건은
-- 신규 15건 INSERT(12건) + PM 지정 수동 매칭(6건)으로 전부 채움. 최종 결과:
--   - 95개 lesson 전부 매칭 완료 (기존 CSV 77 + 신규 15건 INSERT로 12개 보강
--     + PM 지정 질문 문구로 수동 매칭 6개)
--   - 93개 고유 quiz 사용, 2건은 기존 CSV 단계에서 후보가 1개뿐이라
--     부득이하게 다른 lesson과 동일 quiz 중복 배정됨
--     (아래 CONFLICT 표시, PM 확인 요청 -- 이번 6건 추가와는 무관)
--
-- 최종 매칭표 전체: docs/mappings-archive/iipa/lesson_quiz_final_1to1_matching.csv
--
-- 컬럼은 PostgREST OpenAPI 스키마(GET /rest/v1/)로 chapter_cards.id가
-- uuid PK임을 재확인해 자기참조 FK로 설계함 (information_schema는
-- PostgREST에서 직접 조회 불가):
--   chapter_cards.linked_quiz_id = uuid, nullable, FK -> chapter_cards.id
--
-- ⚠️ DDL(ALTER TABLE) 포함 -- Supabase JS 클라이언트로 실행 불가.
-- PM 검토 후 오너가 Supabase SQL Editor에서 직접 실행할 것.
-- 실행 순서: 1) ALTER TABLE 2) UPDATE 89건 (아래 전부 하나의 트랜잭션)
--
-- ⚠️ CONFLICT 2건 (아래 목록) 은 PM 확인 후 필요 시 이 파일의 해당
-- UPDATE 문 id만 교체해서 재실행 권장 -- 지금은 임시로 rank-1 후보를
-- 그대로 사용함.
--
-- ⚠️ linked_quiz_id에는 quiz/exam 타입 카드만 들어가야 하지만, DB
-- 레벨에서 content_type을 검증하는 CHECK 제약은 걸지 않음(자기참조 FK만
-- 존재하는 다른 chapter_cards row를 가리키는지만 보장) -- 애플리케이션
-- 레이어(이 매칭표 생성 로직)에서만 보장되므로 향후 수동으로 값을 넣을 때
-- 주의.
-- ================================================================

-- 1) 컬럼 추가
ALTER TABLE chapter_cards
ADD COLUMN linked_quiz_id uuid REFERENCES chapter_cards(id);

-- 2) lesson -> quiz 1:1 매칭 반영 (89건)
BEGIN;

UPDATE chapter_cards SET linked_quiz_id = '1eed6137-9a30-4bff-8684-568713152dcc' WHERE id = '1446ef07-5dbc-48de-9444-f610ccb6bcc0'; -- [고관절 근육 (굴곡/신전/외전/외회전)] 고관절 ROM과 장요근 Iliopsoas
UPDATE chapter_cards SET linked_quiz_id = '6953d637-18f6-4b1b-809b-4e4bed4f9d8c' WHERE id = '5f1d201c-b516-4d24-a0af-0b5579e69c98'; -- [고관절 근육 (굴곡/신전/외전/외회전)] 둔근 3형제: 대둔근, 중둔근, 소둔근
UPDATE chapter_cards SET linked_quiz_id = '16b5824e-580c-48d1-9817-c7edef143cae' WHERE id = '4c9e3509-61ba-4f77-b395-1c11dcb46a20'; -- [고관절 근육 (굴곡/신전/외전/외회전)] 대퇴근막장근(TFL)과 고관절 외회전근군
UPDATE chapter_cards SET linked_quiz_id = 'f522fae2-114c-419a-98b6-f5cc1cf8b505' WHERE id = 'b06c084a-75b1-4595-9dd2-17c22fa69efc'; -- [동작과 근육] 체간 동작과 관여근육
UPDATE chapter_cards SET linked_quiz_id = 'e63b906c-8d3f-4b05-aa05-5f5e75bdef53' WHERE id = '51de8e50-7ddb-4ccd-8246-d81e80b23006'; -- [동작과 근육] 어깨(견갑골 포함) 동작과 관여근육
UPDATE chapter_cards SET linked_quiz_id = '5a9f1aa4-d1b8-401e-ae50-ee78b7693e59' WHERE id = '65e389c1-5c67-4b50-8a1a-cf6ea3374a63'; -- [동작과 근육] 고관절 동작과 관여근육
UPDATE chapter_cards SET linked_quiz_id = '06fae99a-6f6d-4894-9e8d-ca2e2e0ad197' WHERE id = 'd14ff12d-c048-4e1d-9eb7-e64a4dff4b2f'; -- [동작과 근육] 무릎 동작과 관여근육
UPDATE chapter_cards SET linked_quiz_id = 'd11c584f-dfc3-40f1-8f68-f323cfd84eda' WHERE id = '9ab047d4-3044-4afb-ba75-6415fb04abde'; -- [동작과 근육] 발목 동작과 관여근육
UPDATE chapter_cards SET linked_quiz_id = '057f9798-653d-42af-b4b8-847fbc12c22f' WHERE id = '96cb2453-7603-4e78-a0e1-ed2ae3b44c42'; -- [촉지란?] 촉지(Palpation)란 무엇인가
UPDATE chapter_cards SET linked_quiz_id = '0d503aee-a53f-4d7c-b8e4-1e7a1a99cc5d' WHERE id = 'fd914a54-b62e-4778-9893-11cd164b719c'; -- [촉지란?] 촉지를 위한 손 사용법
UPDATE chapter_cards SET linked_quiz_id = 'ff1287ad-65c9-42b0-b6a9-aa487babb1e1' WHERE id = '8c50c339-9166-4fd6-9e45-f4a25929981f'; -- [촉지란?] 촉지 시 주의사항
UPDATE chapter_cards SET linked_quiz_id = '0d503aee-a53f-4d7c-b8e4-1e7a1a99cc5d' WHERE id = 'a245f9f4-7dd9-48da-b937-85aeac3fe5b9'; -- [촉지란?] 구조물별 질감 차이 구분하기  -- ⚠️ CONFLICT: CONFLICT: 모든 후보가 이미 다른 lesson에 배정됨 - rank1 중복 사용, PM 검토 필요
UPDATE chapter_cards SET linked_quiz_id = '2e0c267f-fc13-4705-aeac-a6437f808f54' WHERE id = '9e244b2b-54bc-4dab-a1ff-420ab9cad8d0'; -- [근육 촉지] 몸통 근육 촉지 — 승모근·외복사근·복직근
UPDATE chapter_cards SET linked_quiz_id = 'b5fc77f9-2cf2-474a-9e12-9732e3bcfcae' WHERE id = '32ba5c39-41f2-4021-be50-74263b09f938'; -- [근육 촉지] 견갑대·상완 근육 촉지 — 회전근개·이두근/삼두근·광배근
UPDATE chapter_cards SET linked_quiz_id = 'b22ca435-030a-4490-bce9-c08db46c4127' WHERE id = 'ba86e4f5-676f-45e3-acce-3023206412cf'; -- [근육 촉지] 대퇴 앞면 근육 촉지 — 대퇴사두근
UPDATE chapter_cards SET linked_quiz_id = '4faf03da-10d5-4a29-9316-a52a317a8e51' WHERE id = '214b6381-910b-4150-acb2-c9ffa399bbd9'; -- [근육 촉지] 대퇴 뒤·둔부 근육 촉지 — 슬괵근·대둔근/중둔근·TFL
UPDATE chapter_cards SET linked_quiz_id = '6f6f82eb-ee8a-4f0f-8ca8-75f2d708c05f' WHERE id = 'd62496f9-b48f-41ec-99e8-7f9f2454501b'; -- [근육 촉지] 하퇴 근육 촉지 — 비복근·넙치근·전경골근
UPDATE chapter_cards SET linked_quiz_id = 'fddad111-932a-49a7-a138-cbb9923d3a2e' WHERE id = '43e95e82-9d17-4f49-ab79-9c8404fa90cd'; -- [관절 움직임 용어] 기본 움직임 용어: Flexion/Extension
UPDATE chapter_cards SET linked_quiz_id = '1e00e62e-762d-4f2d-b78c-6b43eeeb2bcc' WHERE id = 'e715285f-efd0-4845-b97c-0139a55ea6f3'; -- [관절 움직임 용어] 기본 움직임 용어: Abduction/Adduction
UPDATE chapter_cards SET linked_quiz_id = '4e8591a9-21c0-4bfb-a516-67b9232c1c80' WHERE id = 'ae836ab7-1ff8-43b3-8bbd-f13cd7113e78'; -- [관절 움직임 용어] 기본 움직임 용어: Rotation, Pronation/Supinatio
UPDATE chapter_cards SET linked_quiz_id = 'cf9295f8-4267-48c3-af8c-bc5a7821b106' WHERE id = '21658ce2-c18f-4139-8150-1ffd63fed96f'; -- [관절 움직임 용어] 특수 움직임 용어: 발목, 견갑골
UPDATE chapter_cards SET linked_quiz_id = 'cf993ff5-9c67-4c79-a323-83b54f417dc8' WHERE id = 'a79f5351-ff31-4b25-ba91-217141c3ff36'; -- [관절 움직임 용어] 어깨 관절 vs 견갑골 움직임 구분
UPDATE chapter_cards SET linked_quiz_id = 'b6e46e58-b330-4e75-9fb8-b9c7cbf5696d' WHERE id = 'cb10dd49-f987-4e54-bc29-c15b02e6325d'; -- [상완 근육] 상완이두근과 상완삼두근
UPDATE chapter_cards SET linked_quiz_id = '56388e09-e4e8-4b50-933e-1b4791387263' WHERE id = '621e62b2-6981-4b6e-b42b-86973fa22ccc'; -- [회전근개와 삼각근] 회전근개 Rotator Cuff 4개 근육
UPDATE chapter_cards SET linked_quiz_id = '69029760-23d4-4bc5-a356-daac3f09ee11' WHERE id = '60605c11-b36f-4145-870f-b6c5e1d42d75'; -- [회전근개와 삼각근] 삼각근 Deltoid
UPDATE chapter_cards SET linked_quiz_id = 'f9ff847f-7130-4c02-8844-4a5c17b02e1f' WHERE id = 'b431351b-eb4c-4ad9-ac54-7ee007a58f6f'; -- [복근과 코어] 복벽 근육
UPDATE chapter_cards SET linked_quiz_id = '67189e6a-3210-4faa-b16c-6c254ade238e' WHERE id = 'cf89358b-cdcd-4fa6-98fd-a16d6d1c3ae0'; -- [복근과 코어] Inner Core Muscles
UPDATE chapter_cards SET linked_quiz_id = 'c1db5d69-3d46-475f-b0e3-5ea56102f214' WHERE id = 'ea627362-cc6a-4f7f-8e9b-23a364c0d612'; -- [해부학적 자세와 기본 자세] 해부학적 자세 (Anatomical Position)란?
UPDATE chapter_cards SET linked_quiz_id = '6d1081ec-5dd0-45a5-a473-cac7316bdc24' WHERE id = '9254058f-7edd-4935-bf9f-c028508de574'; -- [해부학적 자세와 기본 자세] 운동 기본 자세의 종류
UPDATE chapter_cards SET linked_quiz_id = '75c325d6-0740-452a-9050-1bf653b4d81c' WHERE id = '66a9092b-9cbc-4eff-9d94-db95e26783e1'; -- [해부학적 자세와 기본 자세] 자세에 따른 관절 움직임 분석
UPDATE chapter_cards SET linked_quiz_id = '3a97c527-0ef1-43cd-9d6a-e57d8d461201' WHERE id = '4717774f-49ed-447f-ab7c-dd2eb1b61323'; -- [자세평가 실습] 자세평가 실습 절차 개요
UPDATE chapter_cards SET linked_quiz_id = '52f65470-49cb-4bdc-8cb5-0db0fba8fdc8' WHERE id = '661c535f-6168-43b9-a38a-3625a1e62115'; -- [자세평가 실습] 체크리스트 활용 시 주의점
UPDATE chapter_cards SET linked_quiz_id = 'ecca2758-d04f-4858-ad05-c3ce5d9a60ea' WHERE id = 'ba24c93a-c03d-4f9b-b57f-e88d7a727676'; -- [고관절 내전근과 대퇴사두근] 고관절 내전근군 6개
UPDATE chapter_cards SET linked_quiz_id = 'f967e459-7c0e-45bb-8da5-4483a674357e' WHERE id = '829b4477-7ac3-493f-8aa1-ba1b9f0a428e'; -- [고관절 내전근과 대퇴사두근] 봉공근과 대퇴사두근
UPDATE chapter_cards SET linked_quiz_id = '50d74787-8e0f-4ebb-849d-05006bd901b2' WHERE id = '6dcaa472-351a-4ab8-9bb9-7e9577118d71'; -- [대흉근, 광배근, 대원근] 광배근과 대원근
UPDATE chapter_cards SET linked_quiz_id = 'e14b5ee5-7732-457e-8e90-57317acae5dd' WHERE id = '19e70b5b-b480-430f-9ff6-47da4663e0f9'; -- [대흉근, 광배근, 대원근] 대흉근 Pectoralis Major
UPDATE chapter_cards SET linked_quiz_id = '5e5c7a1b-75dc-40ad-b958-a7f7d40648e8' WHERE id = '4f99649c-94a5-4531-a812-349209e96238'; -- [상지골] 상지대와 자유상지골
UPDATE chapter_cards SET linked_quiz_id = '738e570e-0ce5-4e68-8299-9d9bd05378c4' WHERE id = 'cb3d31ee-f1a7-453a-ac76-0710d5b10e60'; -- [상지골] 상지골의 Bony Landmark
UPDATE chapter_cards SET linked_quiz_id = '1964a593-da33-4b53-b189-40e8389137cb' WHERE id = 'fbebcd05-eee9-404b-bdee-1ef57239ab10'; -- [상지골] 흉골과 흉곽
UPDATE chapter_cards SET linked_quiz_id = '521fdfb2-927a-4a48-8374-4e62c022c808' WHERE id = '25666a63-4303-4f27-8243-9293c75f0e67'; -- [해부학적 면과 축] 해부학적 면 (Anatomical Planes)의 개념
UPDATE chapter_cards SET linked_quiz_id = '3374a02c-725d-4d43-8fbc-797c636442ce' WHERE id = 'bb5c925f-d822-45d5-b2c0-615d64f17c07'; -- [해부학적 면과 축] 시상면 (Sagittal Plane)
UPDATE chapter_cards SET linked_quiz_id = 'c2ff4fad-e808-428f-9db1-1c3bdc4a6893' WHERE id = '398c0970-c1f1-4d56-8aa3-d81d73bd40b5'; -- [해부학적 면과 축] 관상면/전두면 (Frontal/Coronal Plane)
UPDATE chapter_cards SET linked_quiz_id = '3374a02c-725d-4d43-8fbc-797c636442ce' WHERE id = '73b49e2f-d3d2-4e10-9739-7dff593b46db'; -- [해부학적 면과 축] 횡단면/수평면 (Transverse/Horizontal Plane)  -- ⚠️ CONFLICT: CONFLICT: 모든 후보가 이미 다른 lesson에 배정됨 - rank1 중복 사용, PM 검토 필요
UPDATE chapter_cards SET linked_quiz_id = '177fda4f-0fd8-49ea-a053-2dd4538fc325' WHERE id = '7ac5f3aa-95bf-4d77-8178-ec93b711397a'; -- [척추] 척추의 구성과 개수
UPDATE chapter_cards SET linked_quiz_id = '8bdc7355-5097-4170-8d2c-b4d723f0dfc1' WHERE id = '797a745b-348b-4e3d-9e80-f5c1e51f722d'; -- [척추] 척추의 만곡 (Spinal Curves)
UPDATE chapter_cards SET linked_quiz_id = 'e0db6c13-54a8-4abf-a8b8-2b81434a1f18' WHERE id = '38a0ec16-3223-4890-b4cf-32e6ad593325'; -- [척추] 특수 경추: C1(Atlas)과 C2(Axis)
UPDATE chapter_cards SET linked_quiz_id = 'bf113175-9596-4a72-95fa-5e18d12eb4ae' WHERE id = 'ca6a66ec-d1a3-491b-831a-35440ebd7c7b'; -- [하지골과 골반] 골반뼈 (Pelvic bone/Hip bone)
UPDATE chapter_cards SET linked_quiz_id = '6a8b48b6-5f9f-4cc4-a741-69029d8be4f8' WHERE id = 'eac8c143-05f9-48c9-b94f-8d6f4511ec41'; -- [하지골과 골반] 자유하지골: 대퇴골, 슬개골, 경골, 비골
UPDATE chapter_cards SET linked_quiz_id = '4b3973d6-7bce-454e-a3d2-ae4cef242ac9' WHERE id = '5d3884c3-4d79-45c7-b6ac-804bfd33242a'; -- [하지골과 골반] 하지골의 Bony Landmark
UPDATE chapter_cards SET linked_quiz_id = 'f1bdc14e-a898-4de8-b098-c75bb4a415e1' WHERE id = '38a92b5e-befd-4bf1-a1df-22e749b6e027'; -- [하지골과 골반] 발의 뼈: 족근골, 중족골, 족지골
UPDATE chapter_cards SET linked_quiz_id = '7cbf5f6c-45ef-44ec-abaf-55a75c8ffab3' WHERE id = 'f7a038a8-f1ba-43cc-90fd-7c915ce0fdd1'; -- [햄스트링과 하퇴 근육] 햄스트링 3개 근육
UPDATE chapter_cards SET linked_quiz_id = '8dbfa52a-327d-4477-9104-3152bc662d1d' WHERE id = '5bd5b026-6132-46d2-833a-942b83a3b584'; -- [햄스트링과 하퇴 근육] 하퇴삼두근: 비복근과 가자미근
UPDATE chapter_cards SET linked_quiz_id = '617a6a12-8f72-4ba2-8b62-0ba3b0c957d5' WHERE id = '82f00a12-af68-43e8-9a87-99c4b30ae4b3'; -- [햄스트링과 하퇴 근육] 슬와근 Popliteus
UPDATE chapter_cards SET linked_quiz_id = '80fb67f0-9ed5-4681-bda5-2cd2ece53d14' WHERE id = '1d0f5532-577e-4ecb-bcbe-e06d11de632b'; -- [관절의 종류] 관절의 6가지 종류
UPDATE chapter_cards SET linked_quiz_id = 'ede91702-3dd3-48c2-bd06-f6deed222d53' WHERE id = 'b70ca745-e282-4cf8-8314-055b079470d8'; -- [관절의 종류] 경첩 관절 (Hinge Joint) 상세
UPDATE chapter_cards SET linked_quiz_id = 'd2b93980-2ba3-4e75-a4c5-65192884526f' WHERE id = '14b777c7-5dd5-4f09-b69e-4bc3db48cc95'; -- [관절의 종류] 구상 관절 (Ball & Socket Joint) 상세
UPDATE chapter_cards SET linked_quiz_id = 'd28898b9-f3f0-4163-904d-a958cb1797b5' WHERE id = 'e1822de6-d79d-4fbd-ba27-b8fb91430f5d'; -- [견갑골 근육] 승모근 Trapezius
UPDATE chapter_cards SET linked_quiz_id = '6a1729d4-a9c4-40f1-8156-f4820e2424e6' WHERE id = '5b9b178e-fdb3-471b-a729-31a9bf49c7be'; -- [견갑골 근육] 능형근, 견갑거근, 전거근
UPDATE chapter_cards SET linked_quiz_id = 'aff2727c-ed91-4f12-b0f3-faeea427c074' WHERE id = '5919332e-5278-4e00-9c8e-eea695c54850'; -- [뼈 촉지] 상지 및 견갑골 촉지 랜드마크
UPDATE chapter_cards SET linked_quiz_id = 'd9033f96-ff8a-48b2-bd29-32d54fe7e291' WHERE id = '391d9ef9-3bb0-484f-8f68-795d1eb93038'; -- [뼈 촉지] 몸통 및 척추 촉지 랜드마크
UPDATE chapter_cards SET linked_quiz_id = 'b53c3570-2826-43ab-a713-9b42e1b88227' WHERE id = 'e08d437d-ba21-4641-bd35-9067b0ee93a6'; -- [뼈 촉지] 골반 촉지 랜드마크
UPDATE chapter_cards SET linked_quiz_id = '52d7bf62-cebc-4aaa-8652-8a210f51c37b' WHERE id = '2441918f-f6b7-4e20-9f90-eee97a3dd87c'; -- [뼈 촉지] 하지(무릎~발목) 촉지 랜드마크
UPDATE chapter_cards SET linked_quiz_id = 'b5dd023e-8fa6-4ed7-854f-7f6753d95a33' WHERE id = '092393e9-95c5-4f3f-918b-c7eb0db9b738'; -- [발목 근육] 전경골근과 후경골근
UPDATE chapter_cards SET linked_quiz_id = '77499c30-e78b-4267-8116-08f6cf884a2d' WHERE id = 'a1142dd8-2755-404c-8160-1c705777232b'; -- [발목 근육] 비골근군: 장비골근과 단비골근
UPDATE chapter_cards SET linked_quiz_id = '8a3b2d65-6995-4a04-ba2c-fa755b897286' WHERE id = '5d248f55-7ba9-4a85-a6ec-06606ab1661c'; -- [상지 관절] 어깨 관절의 5가지 구성
UPDATE chapter_cards SET linked_quiz_id = '56bb832f-9313-4573-9a10-7ecc8b1e1794' WHERE id = 'cdfa6ca5-4703-4b92-82b5-054c0bd8a24b'; -- [상지 관절] 팔꿈치 관절과 인대
UPDATE chapter_cards SET linked_quiz_id = '16b3cfff-beb5-4fb5-87c7-f11cece38b5f' WHERE id = 'e0e531f8-98a2-4f71-8304-570c4954402b'; -- [하지 관절] 고관절 (Hip Joint)
UPDATE chapter_cards SET linked_quiz_id = 'b939b603-5296-4734-b96a-25a518261fa5' WHERE id = 'ee3b5b18-d720-4bf7-952c-2909f17fb740'; -- [하지 관절] 슬관절과 인대
UPDATE chapter_cards SET linked_quiz_id = 'e75f6fae-f9ac-41ff-87e9-f6f43adf3994' WHERE id = '82208f05-296a-438e-88dc-cdb30c2ceb13'; -- [하지 관절] 발목 관절
UPDATE chapter_cards SET linked_quiz_id = '79ae07dd-19f8-4b38-8fc1-e35ba633b9a3' WHERE id = '0c4bc30b-f35f-4fee-8761-c7f08da0706f'; -- [관절의 기초] 관절(Joint)이란?
UPDATE chapter_cards SET linked_quiz_id = '6111f07f-3516-40e0-a3e1-9d883cf11e6e' WHERE id = '152b0d62-0631-4fbe-b1d0-67543967c5cc'; -- [관절의 기초] 관절의 기본 구조 (주변 구조물)
UPDATE chapter_cards SET linked_quiz_id = 'a70314ca-2408-46ad-8cb0-72a3df176e27' WHERE id = '920268c1-ff18-4cfb-8f93-c80fee7ba227'; -- [관절의 기초] 관절 운동 형상학 (Arthrokinematics)
UPDATE chapter_cards SET linked_quiz_id = '817bdec4-9bc8-435a-b6c6-4b5ece9d61ab' WHERE id = '11783fcc-755a-4301-881d-b658c295ff94'; -- [목 근육] 흉쇄유돌근 SCM
UPDATE chapter_cards SET linked_quiz_id = '7c5a6c9a-84d2-4a10-8898-a06025ac871a' WHERE id = '0b5ef135-9f47-47d1-bb7c-4d14f3f55a6b'; -- [목 근육] 사각근 Scalene
UPDATE chapter_cards SET linked_quiz_id = 'e029290d-27cc-40a6-b6d7-667f6b51a476' WHERE id = '1738f0a2-7fda-4dc6-99b5-43594269d4b9'; -- [목 근육] 목 신전근과 후두하근
UPDATE chapter_cards SET linked_quiz_id = '500b73d2-dd8d-4e55-b279-c69d7103bab4' WHERE id = 'e63f596f-87d2-47c7-a5ee-2ced07a352c7'; -- [자세의 이해] 자세(Posture)란 무엇인가
UPDATE chapter_cards SET linked_quiz_id = '4f3d9070-5a2d-419c-8ae5-1ccb38e8dbc5' WHERE id = '45cc403f-4e8a-44e8-bb73-0037c770f721'; -- [자세의 이해] 부적절한 자세와 근골격계 통증의 관계
UPDATE chapter_cards SET linked_quiz_id = '259ae009-6063-4e77-ba01-c3f7ef215a34' WHERE id = '5439d858-8eff-41c4-bca3-8d45f264cb09'; -- [자세의 이해] 자세에 영향을 미치는 요인
UPDATE chapter_cards SET linked_quiz_id = '0b61035a-5fc4-4b56-a86e-2e5524981de6' WHERE id = 'a48032ea-e343-4ed8-84c4-0581c2315abc'; -- [자세의 이해] 자세평가의 목적과 시기
UPDATE chapter_cards SET linked_quiz_id = '4a94a901-1137-452a-91aa-a7026cc9133b' WHERE id = '115024e6-a117-4bf0-91ec-53344692a8d2'; -- [근육의 기초] 근육 수축의 종류
UPDATE chapter_cards SET linked_quiz_id = '3a9427a8-dd13-4b28-aff8-456ebe1cb6f9' WHERE id = 'b44529b5-34e5-427a-9ae5-8e9b8d1ccc9f'; -- [근육의 기초] 작용에 따른 근육 분류
UPDATE chapter_cards SET linked_quiz_id = 'fc2649a4-8f3c-43b1-af4a-db33a72ac49a' WHERE id = '4713d50b-2d18-4fdf-b0e1-9a29f1e0baee'; -- [근육의 기초] 고유수용성 감각기: 근방추와 GTO
UPDATE chapter_cards SET linked_quiz_id = '80b1d981-d02d-4169-8c3d-97d58bd9dfb0' WHERE id = 'b451ca1c-5306-449a-94b3-a9e0e5dbcc96'; -- [해부학적 방향 용어] 기본 방향 용어: Superior/Inferior, Anterior/Po
UPDATE chapter_cards SET linked_quiz_id = '0a1896a6-6406-406a-b11a-0d6f944ee574' WHERE id = '640fa35f-3c2f-4801-a68a-e4bcb0d64c22'; -- [해부학적 방향 용어] 기본 방향 용어: Medial/Lateral, Proximal/Dista
UPDATE chapter_cards SET linked_quiz_id = '624ace2e-b046-42ef-906a-67baa5d2cdb0' WHERE id = '8d337f83-f9b5-4163-8945-755b3479c276'; -- [해부학적 방향 용어] 추가 방향 용어: Superficial/Deep, Ipsilateral/
UPDATE chapter_cards SET linked_quiz_id = '10750451-4cf2-44e6-ac5a-d6f4c897ba35' WHERE id = '74b861b0-af80-4640-9780-222e8909bf2f'; -- [뼈의 기초와 분류] 뼈의 기능
UPDATE chapter_cards SET linked_quiz_id = 'e262e4fc-cfaf-40ac-9dbe-a054086e78db' WHERE id = '30a0a087-3aed-4dfe-9c1a-1344980e1026'; -- [뼈의 기초와 분류] 뼈의 형태에 따른 분류
UPDATE chapter_cards SET linked_quiz_id = 'c3e71907-931f-41bd-ab21-b5c063696b49' WHERE id = '275f0e91-27f6-4cd6-8414-74c785f2f19b'; -- [뼈의 기초와 분류] 축골격(Axial)과 사지골격(Appendicular)
UPDATE chapter_cards SET linked_quiz_id = 'ed38b6c8-1934-49f5-a6ec-cd8a6d3da1c3' WHERE id = '449ad8b0-8207-4710-b34a-811358ba0969'; -- [척추 근육] 척추기립근 Erector Spinae
UPDATE chapter_cards SET linked_quiz_id = 'ae0e9e15-fc14-48b0-b1ea-47ba7a978e9c' WHERE id = '2e44e753-86a1-4dc4-9376-3d9114cec399'; -- [척추 근육] 다열근과 요방형근
UPDATE chapter_cards SET linked_quiz_id = 'b4ecf55a-4cc0-4dd0-b5f3-5d8a43c4f162' WHERE id = 'b52add47-2f72-4521-99d7-0f02e296c108'; -- [자세 평가 방법] 이상적 정렬(Normal Posture) 기준
UPDATE chapter_cards SET linked_quiz_id = 'dcb7c28e-b8a4-4530-a0e2-e63a713c61c3' WHERE id = 'c2c60086-2982-4d43-99eb-2630719bf7ad'; -- [자세 평가 방법] Kendall 4체형 개관 및 척추전만·후만-전만 자세
UPDATE chapter_cards SET linked_quiz_id = 'e1625f92-1da1-4470-95f9-447b9aa36245' WHERE id = '0584aa77-dc03-4634-9409-adb2bb79e23b'; -- [자세 평가 방법] Kendall 편평등·굽은등 자세
UPDATE chapter_cards SET linked_quiz_id = '616c01a4-782b-4565-9145-2d225dd89cdf' WHERE id = '0fb61f8f-105e-4cb6-8dfe-9557aa4f7a66'; -- [자세 평가 방법] 골반 위치 평가 — 후면 정렬
UPDATE chapter_cards SET linked_quiz_id = '9248e1dc-e92a-421f-9586-f7b7852f66ad' WHERE id = '986762ca-d4e7-4ac1-9bfd-4da49b763f87'; -- [자세 평가 방법] 하지 정렬 평가 — 내반슬/외반슬, 아치 평가

COMMIT;

-- ================================================================
-- 미배정 lesson 6건 (linked_quiz_id NULL 유지 -- 콘텐츠 보강 필요)
-- ================================================================

-- ================================================================
-- CONFLICT 2건 상세 (동일 quiz가 2개 lesson에 중복 배정됨)
-- ================================================================
-- [촉지란?] 구조물별 질감 차이 구분하기 (lesson id: a245f9f4-7dd9-48da-b937-85aeac3fe5b9) -> quiz 0d503aee-a53f-4d7c-b8e4-1e7a1a99cc5d
-- [해부학적 면과 축] 횡단면/수평면 (Transverse/Horizontal Plane) (lesson id: 73b49e2f-d3d2-4e10-9739-7dff593b46db) -> quiz 3374a02c-725d-4d43-8fbc-797c636442ce

-- ================================================================
-- 실행 후 확인용 쿼리 (참고, 실행 안 해도 됨)
-- ================================================================
-- SELECT id, question, linked_quiz_id FROM chapter_cards
-- WHERE content_type = 'lesson' AND linked_quiz_id IS NOT NULL LIMIT 20;
--
-- -- 중복 배정 확인 (같은 quiz를 가리키는 lesson이 2개 이상인 경우)
-- SELECT linked_quiz_id, count(*) FROM chapter_cards
-- WHERE linked_quiz_id IS NOT NULL GROUP BY linked_quiz_id HAVING count(*) > 1;
