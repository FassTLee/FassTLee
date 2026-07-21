# Kinepia — Claude Code 작업 원칙

이 파일은 세션 시작 시 자동으로 로드됩니다. PM 세션(별도 Claude Project)이 매번 채팅으로 전달하던 반복 규칙을 여기 정리했습니다.

_PM 지침 v1.7 기준 동기화 (2026-07-21)_

## 절대 원칙
- 파일은 **항상 읽고 나서** 수정한다. 구조를 가정하지 않는다.
- 지시받지 않은 파일은 수정하지 않는다.
- 커밋·배포는 **오너만** 실행한다. 코드 작성까지만 하고 대기한다.
- 확인 못 한 항목은 "미확인"으로 명시한다. 추측으로 채우지 않는다.

## 보고 시 근거 표기 (필수)
검증 결과를 보고할 때 아래를 항목마다 구분한다.
- (a) 실제 브라우저 렌더링 확인
- (b) DB 조회 결과
- (c) 코드 로직을 스크립트로 재현한 계산
**(c)는 ✅로 표기하지 않는다.** "로직 재현"임을 명시한다.

## DB 조회 키
- **service_role**: RLS 우회. 전수 집계·정합성 조사용.
- **anon**: RLS 적용. **화면 동작 판단은 반드시 이 키로.**
- 보고에 어느 키를 썼는지 항목마다 명시한다.
- 예: certifications는 anon에게 `is_active = true` 행만 보인다.

## DDL
- Supabase JS로 ALTER TABLE 불가. SQL 파일로 작성해 오너에게 전달한다.
- SQL 작성 전 `information_schema.columns`로 실제 컬럼명·타입 확인.
- 확인된 타입을 SQL 주석에 명시한다.

### upsert 관련 주의
Supabase JS는 `column = column + 1` 같은 SQL 증분식 upsert를 지원하지 않는다. 카운터 성격의 컬럼은 리터럴 값으로 덮어써지지 않도록 select-then-insert/update 패턴으로 구현한다.

## 마이그레이션 파일
- 명명: `YYYYMMDD_설명.sql` (8자리, 시간부 없음). 작성 전 기존 파일명 확인.
- 같은 테이블·행을 다루는 기존 파일이 있는지 확인하고 대조한다.
- 멱등 처리 필수: `IF NOT EXISTS`, 제약은 `DO $$ pg_constraint 확인 $$`,
  UPDATE는 `WHERE 대상컬럼 IS NULL` 조건 포함.
- **신규 테이블은 RLS를 함께 설정한다** (미설정 시 anon 무제한 접근).
- 여러 DDL은 `BEGIN; ... COMMIT;`으로 묶는다.

## 반복 함정
- `courses.title` / `certifications.name` — 테이블마다 명명이 다르다.
- 배열·UUID 캐스팅: `text[]` vs `name[]`, `uuid` vs `text` 명시적 캐스팅.
- `chapter_stats.user_id`는 text, `profiles.id`는 uuid → `p.id::text` 캐스팅.
- 과목→자격증 매핑 정본은 `course_certifications`.
  `courses.certification_id` 직접 컬럼은 공유 course를 누락한다.
- `.single()`은 0행일 때도 PGRST116을 던진다. 0행 가능성이 있으면 `.maybeSingle()`.
- `ORDER BY` 없는 SELECT의 순서에 로직이 의존하면 안 된다.
- `information_schema.tables`는 신규 테이블을 누락할 수 있다 → `pg_tables` 교차 확인.
- 신규 course 생성 시 `course_certifications` 매핑까지 한 트랜잭션으로.
- 서버 쓰기는 `supabaseAdmin`(service_role). anon은 RLS로 차단된다.
- 답안 채점은 **서버 사이드만**. `answer_index`를 클라이언트 응답에 노출 금지.

## 모델·작업량(effort) 선택 원칙
Anthropic 모델 라인업(Sonnet/Opus/Fable 등급)은 계속 바뀌므로 특정 모델명을 고정하지 않는다. 대신 작업 유형 기준으로 판단한다:
- 정형적 작업(반복 CRUD, 원인이 명확한 단순 수정): 기본 모델 유지
- 고난도 작업(원인 불명 버그 추적, 여러 파일에 걸친 구조적 리팩터링, 아키텍처 결정): 그 작업만 상위 등급 모델로 일시 격상을 고려한다
- 새 모델 세대가 나오면 판단기준은 유지하되 "현재 어떤 등급명이 무엇에 해당하는지"만 그때그때 확인한다

## 콘텐츠 작업 완료 기준
DB SELECT 확인만으로 완료 처리하지 않는다. 신규 카드 샘플 3~5장을
**실제 브라우저로 렌더링**해 explanation/key_points가 의도대로
표시되는지 확인한 뒤에만 완료로 보고한다.

## 콘텐츠 폐기
기존 courses/chapters는 `is_active = false`로 비활성화한다. **DELETE 금지.**
행동 로그가 chapter_id만 갖고 FK가 없어, 원본이 사라지면 역추적이 불가능하다.

## 배포 전 확인
1. 타입체크·빌드 (exit 0)
2. 재현 테스트 — 실제 API 라운드트립 또는 DOM 실측
3. **연관 UX 영향 범위 확인** (같은 화면의 다른 분기, 관련 화면, 상태 표시)
4. `git diff --stat`으로 변경 파일 전수 보고
5. 오너 승인 후 커밋 → push → 배포

## 환경
- prod Supabase: `sbketzgadjvzedbayesc`
- dev Supabase: `jgweeoeikhdjcgkitjfl`
- `.env.development.local`은 건드리지 않는다 (dev/prod 격리).
- 개발자 user_id `4b3089c3-f85b-56ec-99e1-1c959ba4f878`는
  dev와 prod가 **동일**하다. dev 분석 시 제외 필터를 쓰면 안 된다.
- 콘텐츠 관련 JSON은 `docs/source-json/{자격증}/` 하위에 위치.
- Windows CMD: 여러 줄 커밋 메시지 불가, `-m` 반복 사용.
