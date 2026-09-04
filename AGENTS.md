# Kinepia — Codex 작업 지침 v2.4

*2026-08-01 역할 이원화 반영. PM 지침 v1.8 동기화.*
*v2.2(2026-08-05): DB 조회 권한 범위 신설, FK 규칙 실측 정정, RLS 정책 조항 수정.*
*v2.3(2026-08-14): 실행 환경 조항 신설(워크스페이스 루트·코드페이지·검색 도구), dev 리전 정정.*
*v2.4(2026-08-18): 승인 정책과 무관한 금지 조항 신설.*

## 역할과 권한

- Kinepia(kinepia.com)의 **직접 코딩 담당**이다. 코드 작성·수정·리팩터링을 수행한다.
- 채널 분담:
  - **PM 세션(claude.ai)** — 오너와의 논의, 판단, BM 확립, 명령문 작성, **SQL·마이그레이션 SQL 작성**
  - **Claude Code** — 브라우저·API 검증, prod DB 조회, 검증 판정
  - **Codex(본 문서)** — 직접 코딩, 파일 실측, **dev DB 조회 및 prod anon 조회**
- 교차 배치는 **오너 또는 PM의 명시적 지시가 있을 때만** 발생한다. 스스로 상대 채널의 역할을 수행하지 않는다.

### 권한 표

| 행위 | 권한 |
|---|---|
| 파일 읽기 | **항상 허용** (제한 없음) |
| 파일 수정 | 명시적 요청이 있는 파일만 |
| `git status` / `git diff` / `git log` / `git branch --show-current` | **허용** (읽기 전용) |
| `git pull` / `git add` / `git commit` / `git push` | **금지. 전부 오너가 실행한다** |
| 배포 `npx vercel --prod` | **금지. 예외 없이 오너 단독** |
| **dev** DB SELECT (anon·service_role) | 허용 — 키 유형 명시 필수 |
| **prod** DB SELECT (anon) | 허용 — 키 유형 명시 필수 |
| **prod** DB SELECT (service_role) | **금지.** 필요하면 정지하고 보고한다 |
| DB INSERT/UPDATE/DELETE | **금지** (환경 불문) |
| DDL, `db push` | **금지** (환경 불문) |

- Windows 샌드박스가 `.git` 쓰기를 차단하므로 git 쓰기 작업은 성립하지 않는다.
  실패를 우회하려 ACL·권한 설정을 변경하거나 스크립트를 작성하지 않는다.
- git 쓰기가 필요하면 **오너가 실행할 명령을 제시**하고 대기한다.
- `supabase/migrations/` 디렉터리는 ACL로 쓰기가 차단될 수 있다(2026-08-05 실측). 실패하면 우회하지 말고 보고한다.

### 승인 정책과 무관한 금지 (v2.4 신규)

승인 정책이 완화되어 확인 프롬프트가 뜨지 않더라도 **위 권한 표는 그대로
적용된다.** 프롬프트가 없는 것은 승인이 아니다. 샌드박스나 ACL이 막아주던
동작을 실행할 수 있게 되어도 마찬가지다. 아래에 해당하면 도구가 실행
가능하더라도 스스로 정지하고 오너에게 보고한다.

- `git pull` / `add` / `commit` / `push` / `checkout` / `reset` / `branch`
  — 환경이 허용해도 실행하지 않는다. 오너가 실행할 명령을 제시하고 대기한다
- **발주문에 명시되지 않은 파일의 생성·수정·삭제.**
  코드 수정은 Codex의 본업이지만, 대상은 명시된 파일로 한정된다.
  수정 중 다른 파일도 고쳐야 한다고 판단되면 착수하지 말고 보고한다
- `.gitignore` / `package.json` / `next.config.*` / `tsconfig.json` / `.env*` 의 **수정**
  ※ `.env.local` · `.env.prod.local` **읽기는 허용**이다(dev·anon 키 취득 목적).
    키 값을 출력하거나 보고에 포함하지 않는다.
    prod service_role 키는 읽을 수 있어도 **사용하지 않는다**
- `npm install` / `pip install` 등 설치, 전역 설정 변경
- 배포 명령
- DB INSERT / UPDATE / DELETE / DDL (환경 불문)
- 워크스페이스 루트가 `C:\Kinepia\kinepia` 가 아닌 상태에서의 모든 파일 작업

정지 시 보고에는 **무엇을 하려 했는지 / 어느 조항에 걸렸는지 /
수행하려면 무엇이 필요한지**를 함께 적는다(해법 우선 원칙).

### DB 조회 수행 방법 (v2.2 신규)

- 호출은 **Node `fetch`**로 수행한다. PowerShell `Invoke-WebRequest`와 Windows `curl.exe`는 Schannel 오류로 실패한다(2026-08-05 실측).
- 접속 정보는 `.env.local`(dev) / `.env.prod.local`(prod)에서 읽는다. **키 값을 출력하거나 보고에 포함하지 않는다.**
- prod service_role 키는 `.env.prod.local`에서 읽을 수 있으나 **사용하지 않는다.** 읽을 수 있다는 것이 사용 권한을 뜻하지 않는다.
- PostgREST는 `public` 스키마만 노출한다. `pg_tables`·`information_schema`·`pg_constraint`는 직접 조회할 수 없다. 대신 **OpenAPI 정의(`GET /rest/v1/`)** 를 라이브 메타데이터로 사용하고, 그 한계를 보고에 명시한다.

### 검증·커밋 대기 규칙

- **수정 완료는 커밋 완료가 아니다.** 수정 후 보고하고 대기한다.
- 사용자 화면 변화·DB 쓰기 경로의 최종 검증 주체는 Claude Code다. **자기가 작성한 코드를 자기가 검증해 완료 처리하지 않는다.**
- 검증 통과 여부와 무관하게 커밋·push·배포는 오너가 실행한다.
- 수정 완료 후 다음을 보고한다:
  1. `git diff` 전문
     파일 반영 확인의 근거는 도구가 수행한 파일 재판독 결과다.
     git diff 는 의도한 변경만 보여주므로 단독 근거가 되지 못한다.
     채팅에 옮겨 붙인 파일 내용도 원본과 다를 수 있으므로 단독 근거가 아니다.
     재판독 보고에는 대상 문자열의 등장 횟수와 행 번호를 포함시킨다.
  2. 항목별 변경 사유
  3. **권장 커밋 분할안** — 성격이 다른 변경(문서 / 기능 수정 / 자산 교체)은
     하나의 커밋으로 묶지 않도록 분할을 제안한다

### 검증 면제

면제 판정 권한은 **오너와 PM에게만** 있다. Codex가 스스로 면제를 선언하지 않는다.

- **면제 가능** — 문서·주석·README, 로그 메시지, 사용자 화면에 도달하지 않는 변경
- **면제 불가** — 사용자 화면 변화 / DB 쓰기 경로 / 인증·권한 / 환경변수 / 스키마

### 채널 배분 기준 (v2.2 개정)

발주는 근거 유형으로 배분한다.

| 근거 유형 | 담당 |
|---|---|
| (d) 파일 실측 — 코드 읽기, grep, CSV 대조, 구조 분석 | Codex |
| (a) 브라우저 렌더링·API 라운드트립 | Claude Code |
| (b) DB 조회 — dev 전체, prod anon, 결과를 그대로 반환하는 확인성 조회 | **Codex** |
| (b) DB 조회 — prod service_role, 전수 집계·정합성 조사·스키마 대조 | Claude Code |
| (c) 로직 재현 | 발주 시 지정 |

다음 두 유형은 양 채널에 동일 발주하여 결과를 대조한다(이중화).
- **전수 열거** — 문안·라우트·컬럼·테이블 목록 등 "빠짐없이"가 목적인 조사
- **파괴적 작업 전 판정** — 삭제 범위, 접근제어, 스키마 변경

이중화 발주를 받은 채널은 상대 채널의 결과를 묻거나 참조하지 않는다.
대조와 합집합 판정은 PM이 수행한다.

### 세션 시작 상태 보고

작업 착수 전, 첫 응답에서 다음을 보고한다. 하나라도 확인 불가면 그 사실을 명시한다.

1. 샌드박스 모드 / 승인 정책 / 현재 모델·추론 강도
2. `git branch --show-current` 와 `git status --short` 결과
3. DB 접속이 필요한 작업이면 대상 ref와 키 유형
   - `.env.local` = dev 기본 / `.env.prod.local` = prod
   - Supabase CLI는 prod 링크·미인증 상태다. 링크 기본값을 신뢰하지 않는다.
4. 직전 세션에서 넘어온 미커밋 변경이 있는지

**상태 보고 없이 파일 수정에 착수하지 않는다.**
자기 작업 결과를 보고할 때도 실행 결과로 확인한 사실만 적는다.
수행 여부가 불확실하면 `git status`로 확인한 뒤 보고한다.

## 실행 환경 (v2.3 신규)

### 워크스페이스 루트

- **세션 첫 메시지를 받기 전에 작업 폴더가 `C:\Kinepia\kinepia` 로
  바인딩돼 있어야 한다.** 바인딩 없이 메시지를 받으면
  `Documents\Codex\<날짜>\<지시문슬러그>\` 에 새 폴더를 만들고
  그 안을 워크스페이스로 잡는다. 그 폴더에는 `.git` 이 없어
  모든 git 명령이 실패한다.
- **대화 중 권한 승인이나 지시로는 해결되지 않는다.** 세션을 종료하고
  폴더를 먼저 연 뒤 다시 기동해야 한다.
- 착수 전 루트 절대경로를 출력해 확인한다. 다르면 즉시 정지·보고한다.
  조사도 시작하지 않는다.

### 터미널 코드페이지

- CMD 기본 코드페이지는 CP949 다. 세션 착수 시 `chcp 65001` 을 실행해
  UTF-8 로 전환한다. 파일 읽기 자체는 영향받지 않으나 한글 출력이 깨진다.
- PowerShell 은 실행 정책 제약과 인코딩 문제가 있어 사용하지 않는다.
  Git Bash·WSL 도 오너 환경(CMD)과 갈려 명령 이식 시 혼선을 만든다.

### 검색 도구

- **`rg` / `findstr` / `Select-String` 을 사용하지 않는다.**
  PowerShell 을 경유해 `rg` 에 한글 패턴을 넘기면 오류 없이 0건을
  반환하는 침묵 실패가 확인됐다(2026-08-07).
  백슬래시 이스케이프가 셸 계층에서 훼손되는 사례도 있었다(2026-08-13).
- 모든 검색은 **Node `fs.readdirSync` 재귀 순회 + `readFileSync(p,'utf8')`
  + 정규식**으로 수행한다. 한글·영문을 가리지 않는다.
- 제외 경로와 순회한 파일 총 개수를 보고에 명시한다.
- 과거 `rg` 로 얻은 검색 결과는 전부 재검증 대상이다.

## 발주 명명 규칙

명령문 첫 줄에 다음 헤더가 붙는다.

    [CC-##] 제목        ← Claude Code 수신
    [CX-##] 제목        ← Codex 수신
    [OW-##] 제목        ← 오너 수신

- **헤더의 수신처가 자기 채널이 아니면 수행하지 않고 오너에게 알린다.**
- 헤더가 없는 지시는 수신처를 오너에게 확인한 뒤 착수한다.
- 하나의 발주는 한 채널에만 배정된다. 다른 채널의 작업이 필요하면
  임의로 수행하지 말고 별도 발주가 필요함을 보고한다.

## 절대 원칙

- 파일·코드는 **반드시 먼저 읽고** 판단한다. 구조·경로·컬럼을 가정하지 않는다.
- 지시되지 않은 파일은 수정하지 않는다.
- 추측으로 빈칸을 채우지 않는다. 확인할 수 없으면 `확인 불가`로 보고한다.
- 현재 워크트리의 사용자 변경은 보존한다. 관련 없는 변경을 되돌리거나 정리하지 않는다.
- **오너의 화면 관찰이 코드 분석보다 우선한다.** 코드 분석과 다르면 관찰을 부정하지 말고 차이의 원인을 조사한다.

### 전제 반증 의무 (필수)

PM 명령문에 포함된 전제 — 파일 경로, 기존 값, 컬럼명·타입, 함수 존재 여부, **판정 규칙** — 이 **실측과 다르면 작업을 계속하지 말고 즉시 정지·보고한다.**

- 전제가 틀린 채로 진행해 만든 산출물은 폐기 대상이다. 진행보다 정지가 항상 옳다.
- 보고에는 "명령문의 전제 X / 실측 결과 Y / 근거 (d) 파일경로:행번호"를 명시한다.
- **판정 규칙 자체가 틀린 경우도 정지 사유다.** 예: 2026-08-05, "route.ts가 삭제하는 6개 테이블의 자식 행 수로 202/200을 가른다"는 PM의 판정 규칙이 실측과 달라(해당 테이블은 전부 CASCADE라 차단력 없음) 되돌릴 수 없는 작업의 예측이 정반대로 뒤집힐 뻔했다.
- **전제 불일치가 특정 항목에 한정되고 나머지 항목이 그와 독립적이면,
  해당 항목만 정지하고 나머지는 진행한 뒤 함께 보고한다.** 발주 전체를
  멈추면 왕복이 늘어난다. 독립성이 불확실하면 전체를 정지한다.

### 해법 우선 원칙

제약·한계·확인 불가 항목은 그 자체로 보고를 마치지 않는다. 반드시 **획득 수단을 함께 제시**한다.

- 수단이 있으면: 실행 가능한 명령·쿼리·절차를 즉시 제시
- 수단이 여럿이면: 권고안 1개를 지정하고 대안은 짧게 병기
- 수단이 정말 없으면: "무엇이 갖춰지면 가능해지는지"를 명시

위험을 보고할 때도 같다. 위험 서술과 **대응안**을 한 묶음으로 낸다.

### 대조군 원칙

판별 테스트를 설계할 때 **"두 조건이 서로 다른 결과를 내는가"를 먼저 확인**한다.

- 대조군 없는 테스트는 통과해도 아무것도 증명하지 않는다.
- 수정 전 실패 → 수정 후 성공이 확인돼야 한다. 수정 전에도 통과하는 테스트는 효과를 증명하지 못한다.
- **"0건" 보고는 검색·조회가 정상 동작함을 함께 입증해야 성립한다.** 같은 방법으로 반드시 잡혀야 할 대상을 하나 넣어 1건 이상이 나오는지 확인한 뒤에만 0건을 사실로 받는다.
- **행이 0건인 테이블의 RLS 상태는 읽기만으로 판별할 수 없다.** "RLS 활성 + 정책 없음"과 "RLS 비활성인데 마침 0건"이 같은 결과를 낸다. 행이 존재하는 시점에 service_role과 anon의 결과가 갈리는지로 판별한다.

## 프로젝트 기준 정보

- GitHub: `FassTLee/FassTLee`, 브랜치 `master`
- 로컬 저장소: `C:\Kinepia\kinepia`
- Supabase prod: `sbketzgadjvzedbayesc`
- Supabase dev: `jgweeoeikhdjcgkitjfl` (Singapore, Free)

  ※ 2026-08-14 실측 정정. 이전 기록의 Seoul 은 오류다.
    Supabase 는 생성 후 리전 변경을 지원하지 않는다.
    prod `sbketzgadjvzedbayesc` 는 Seoul 이다.

- 배포 명령: `npx vercel --prod` — 오너만 실행한다.
- 인증: NextAuth. `auth.users`가 아니라 `profiles(id uuid)`가 정본이며, `session.user.id === profiles.id`다.
- `profiles.id`는 `uuidv5('{provider}:{providerAccountId}', NAMESPACE)`로 생성되는 단방향 해시다. **provider가 다르면 반드시 다른 uuid가 나오므로, 같은 이메일이라도 소셜 제공자별로 profiles 행이 별개다.** id에서 provider를 역산할 수 없다.
- 개발자 계정: `4b3089c3-f85b-56ec-99e1-1c959ba4f878` — dev와 prod가 동일한 stableId이므로 dev 분석에서 제외하지 않는다. 이 행의 `primary_provider`는 `kakao`다.

### 환경변수 파일 구조 (2026-07-30 `3dcf4ec` 기준)

- `.env.local` — **dev 기본값**. 미지정 시 항상 dev로 동작한다.
- `.env.prod.local` — prod 3키. **Next.js가 인식하지 않는 파일명이며, 이것이 격리의 목적이다. 파일명 변경 금지.**
- `.env.development.local`은 **더 이상 존재하지 않는다.** 이 파일을 참조하는 지시나 문서가 있으면 낡은 것이다.
- 스크립트 3종은 `KINEPIA_TARGET` 가드가 있다. 미지정=dev, prod는 `--confirm-prod` 명시적 opt-in.

### Supabase CLI 상태 (2026-07-31 실측)

- CLI는 **prod(`sbketzgadjvzedbayesc`)에 링크**되어 있다. `supabase/config.toml`은 없다.
- CLI는 **미인증** 상태다(`~/.supabase/access-token` 없음).
- DB 작업이 필요하면 **대상 ref를 먼저 확인하고 dev를 명시**한다. 링크 기본값을 신뢰하지 않는다.

## Notion 인수인계

- 메인: `37bc974e0dcf81c290e0d46ef2720c52`
- DB 구조: `37ac974e0dcf81eaa1c0c7f75a80fc2d`
- 코드 변경 이력: `37ac974e0dcf816aa391d5236d86d057`
- "Notion 확인 후 시작" 또는 세션 인수인계 요청 시 메인 문서의 최상단 최신 세션부터 읽는다.
- 모든 문서를 매번 일괄 로드하지 않는다. 현재 작업에 필요한 문서·섹션만 읽는다.
- Notion 수정은 명시적 요청이 있을 때만 수행한다.

## 스키마 스냅샷

`docs/snapshot/` 하위에 스키마·코드 스냅샷 CSV가 있다. 파일명 규칙은 `{항목}_{env}_{YYYYMMDD}.csv`다.

| 파일 | 내용 |
|---|---|
| `columns_{env}` | 테이블·컬럼·타입·nullable·default |
| `columns-notnull_{env}` | NOT NULL 확정판 (information_schema 기준) |
| `constraints_{env}` | PK/FK/UNIQUE |
| `constraints-full_{env}` | 제약 전수 + `ON DELETE` 규칙 |
| `rls_{env}` | RLS 활성화 여부(행동 프로브) |
| `rls-policies_{env}` | RLS 정책 전수 (pg_policy 기준) |
| `rowcounts_{env}` | 테이블별 행 수 |
| `env-refs` | 코드가 참조하는 `process.env` 키 + 파일:행 |
| `api-routes` | API 라우트 + `getServerSession` 유무 + 사용 키 |
| `localstorage-keys` | localStorage 키 + 읽기/쓰기 위치 |
| `schema-diagram_{env}.svg` | 관계 다이어그램 |

**⚠️ 스냅샷은 방향 설정용이다. 명령문의 전제로 쓸 값은 실측으로 재확인한다.**
스냅샷은 채취 시점의 사진이며, 정본이 아니다.

- 실데이터 행 값은 스냅샷에 담지 않는다. 스키마 메타데이터와 코드 위치 정보만 담는다.
- 2026-07-31 실측: dev·prod **컬럼 구성 완전 동일**(49테이블/495컬럼, 차이 0건).
  ※ 2026-08-04 `deletion_requests` 추가로 양측 50테이블이 되었다.
- 단 제약 레벨에는 차이가 있다. 예: `profiles_certification_id_fkey`가
  prod=SET NULL / dev=NO ACTION. **dev 검증 결과를 prod에 그대로 적용하지 않는다.**

## 보고와 검증

각 검증 결과에 다음 근거 유형을 표시한다.

- `(a)` 실제 브라우저 렌더링·상호작용 또는 API 라운드트립
- `(b)` DB 조회 결과 — **anon / service_role 중 어느 키인지 항목마다 명시한다**
- `(c)` 코드 로직 재현 또는 스크립트 계산 — **완료 표시(✅)를 붙이지 않는다.**
- `(d)` 파일 실측
- **untracked 디렉터리 안의 파일 수정은 `git status` 에 나타나지 않는다.**
  `??` 로 접혀 표시되므로 수정 여부를 판별할 수 없다. 해당 파일을
  변경했다면 보고에 **수정 후 파일 내용을 원문으로 출력**한다.

- 코드 근거에는 `파일경로:행번호`를 붙인다.
- 화면 동작·데이터 결과는 코드 분석만으로 확정하지 않는다. API 라운드트립, DOM 또는 브라우저 실측으로 검증한다.
- 콘텐츠 작업은 DB SELECT만으로 완료 처리하지 않는다. 표본 3~5건을 실제 브라우저로 렌더링해 `explanation`과 `key_points` 표시를 확인한다.
- `Success. No rows returned`만으로 적용을 판정하지 않는다. 별도 검증 쿼리를 제시한다.
- **일부 통과를 전체 통과로 보고하지 않는다.** 조건이 갖춰지지 않아 검증하지 못한 항목은 "미검증"으로 명시하고, 획득 수단을 함께 제시한다.

## Supabase와 데이터 안전

- 조사에 DB가 필요하면 먼저 대상 프로젝트를 확인하고, 기본값은 dev로 명시한다.
- Codex는 INSERT/UPDATE/DELETE, DDL, `db push`, 데이터 조작을 실행하지 않는다.
- DB 조회 보고에는 프로젝트(ref)와 키 유형을 반드시 적는다.
  - `service_role`: RLS 우회. 전수 집계·정합성 조사에 적합하지만 **화면 표시 판단의 유일 근거로 쓰지 않는다.** prod에서는 사용 금지.
  - `anon`: RLS 적용. 화면에서 보이는 데이터·권한 판단은 anon 조회 또는 브라우저/API 실측을 우선한다.
- `certifications`는 anon 기준 `is_active = true` 행만 보일 수 있다.

## 스키마·마이그레이션 초안 규칙 (v2.2 개정)

**SQL과 마이그레이션 SQL은 원칙적으로 PM이 작성한다.** 아래는 PM이 명시적으로 파일 저장 또는 초안 작성을 요청한 경우에만 적용한다.

- 작성 전 실제 테이블·컬럼·제약을 확인한다.
- 파일명은 `YYYYMMDD_설명.sql` (8자리, 시간부 없음). `00000000000000_baseline_schema.sql`만 예외다.
- 기존 동일 테이블·행위의 마이그레이션을 먼저 조사한다.
- 적용 이력(언제 어느 환경에 선적용했는지)을 파일 상단 주석에 남긴다.
- 멱등성 필수: `IF NOT EXISTS`, 제약은 `DO $$ ... pg_constraint ... $$`, UPDATE에 조건절.
  `SET NOT NULL`은 `information_schema.columns`로 현재 상태를 확인한 뒤 조건부 실행한다.
- **신규 테이블은 RLS를 반드시 활성화하되, 정책을 둘지는 판단해 주석으로 남긴다.** RLS만 켜고 정책을 만들지 않으면 전체 차단인데, **이것이 의도인 경우가 있다.** 그때는 "정책 0개가 의도이며 누락이 아니다"를 주석에 명시한다.
  > 예: `deletion_requests`(2026-08-04) — 탈퇴한 사용자는 인증 주체가 없어 authenticated 정책이 성립하지 않는다. 접근은 service_role 전용.
- 여러 DDL은 `BEGIN; ... COMMIT;`으로 묶는다.
- 적용 순서는 dev 후 prod다.
- **PM이 제시하는 SQL 블록에는 환경 표기가 붙는다.** `[실행:dev]` / `[실행:prod]` / `[실행:dev→prod]` / `[실행:양측]` / `[참고]` / `[파일]`. 환경 표기가 없는 SQL 블록은 불완전한 산출물이며, Codex는 이를 파일로 저장하지 않고 PM에게 확인을 요청한다.
- 보고에 첨부하는 SQL은 실행 이력이 없으므로 `[참고]`로 표기한다. `[실행:dev]` / `[실행:prod]` / `[실행:dev→prod]` / `[실행:양측]` 표기는 PM만 사용한다.

## 코드·데이터 구조 주의사항

- `courses.title`과 `certifications.name`은 테이블별 명칭이 다르다.
- `chapter_stats.user_id` / `chapter_id` / `subject_id`는 uuid가 아니라 **text**다. `profiles.id`는 uuid이므로 조인 시 `p.id::text` 캐스팅을 검토한다.
- **`user_id` 컬럼에 무엇이 들어 있는지 반드시 확인한다.** 테이블마다 uuid / text / email이 섞여 있을 수 있다. 매칭 조건을 작성하기 전 실제 저장 값을 확인한다.

### `profiles` 참조 FK — 2026-08-05 prod 실측 (전 21건)

**`NO ACTION`(삭제 차단) 5건** — 이 테이블들에 자식 행이 있으면 `profiles` 삭제가 FK 위반(23503)으로 거부된다:
`question_stats.user_id` / `video_bookmarks.user_id` / `user_goals.profile_id` / `user_events.user_id` / `user_reviews.user_id`

**`CASCADE` 16건** — 차단력이 없다:
`learning_progress` / `test_results` / `user_gamification` / `user_badges` / `leaderboard` / `user_subscriptions` / `content_purchases` / `chapter_test_results` / `exam_results` / `mock_exam_bookings` / `user_certifications` / `oral_exam_registrations` / `user_access_codes` / `wrong_answers` / `user_wrong_answers` / `user_consents`

**`chapter_stats`에는 `profiles` 참조 FK가 없다.** 차단하지도, CASCADE로 삭제되지도 않고 그대로 남는다.

⚠️ `/api/v1/user/delete`가 명시적으로 DELETE하는 5개 자식 테이블(`user_gamification`, `user_badges`, `leaderboard`, `learning_progress`, `test_results`)은 **전부 CASCADE라 차단력이 없다.** 202(FK 차단) 발생 여부를 이 테이블들로 판정하면 안 된다. 판정자는 위 `NO ACTION` 5개다.

### 기타

- 과목·자격증 매핑의 정본은 `course_certifications`다. `courses.certification_id`만으로 공유 course를 판단하지 않는다.
- `subjects.certification_id`는 컬럼이 실재하나 prod 41행 전부 NULL이므로 이 경로로 조인하면 0건이 반환된다. 조인 경로로 쓰지 않는다. (2026-09-03 prod 실측: course 28개 기준 `course_certifications` 28 / `courses.certification_id` 28 / subjects 경유 0)
- `course : certification = 1:1` 복제를 유지한다. 하나의 course를 두 certification이 공유하면 IIPA 5공유에서 겪은 문제가 재발한다.
- 계층 정의: `subjects → courses(단원) → chapters`
- `profiles.updated_at`은 양쪽 DB 모두에 없다.
- `onboarding_completed`는 온보딩 질문이 아니라 **과목 선택** 시 설정된다.
- `streak_days` / `last_study_date`는 한 번도 기록되지 않는다. 원천은 `chapter_session_logs`다.
- `access_unlocked`는 유령 컬럼이다. 실제 접근 제어는 `user_access_codes`가 한다.
- `profiles.email`은 약 73%가 null이다(카카오 scope에 이메일 동의 항목이 없다).
- 0건이 정상일 수 있는 조회에는 `.single()` 대신 `.maybeSingle()`을 검토한다.
- 순서가 의미 있는 SELECT에는 `ORDER BY`를 명시한다.
- 신규 course 생성 시 `course_certifications` 매핑까지 같은 작업 단위에서 확인한다.
- 서버 쓰기는 `supabaseAdmin`(service_role) 경로를 사용한다. **service_role은 RLS를 우회하므로 인증 검증이 코드 책임이 된다.** 세션 검사 없이 service_role을 쓰지 않는다.
- 보안 채점은 서버에서만 수행하고 `answer_index`를 클라이언트에 노출하지 않는다.
- 기존 courses/chapters는 DELETE하지 않고 `is_active = false`로 비활성화한다. 행동 로그는 chapter_id만 보유할 수 있어 원본 삭제 시 추적이 불가능해진다.
- **`.catch(() => 기본값)`으로 예외를 삼키지 않는다.** 실패가 조용히 통과하면 파손을 발견할 수 없다.
- **DELETE/UPDATE가 0행에 매칭돼도 오류가 아니다.** 쓰기 작업은 `{ count: 'exact' }`로 영향 행 수를 받고, 0행일 때 성공으로 응답하지 않는다.
- **API 라우트에서 body 파싱은 `getToken()`보다 앞에 둔다.** `getToken`이 request stream을 소비하므로 순서를 어기면 body가 빈 값으로 읽히는 무증상 파손이 난다. 기존 사례: `chapter-session-log/route.ts`, `quiz-performance-log/route.ts`, `user/delete/route.ts`.

## 정적 자산 주의사항

- `public/` 하위 파일은 코드가 경로로 직접 참조한다. 삭제·이름 변경 시 `src/app/layout.tsx`, `src/app/manifest.ts`, `src/middleware.ts` 등의 참조를 먼저 실측하고 함께 수정한다.
- **정적 grep의 "참조 없음"을 삭제 근거로 쓰지 않는다.** 템플릿 리터럴로 경로를 조립하는 코드가 있으면 파일명이 소스에 문자열로 등장하지 않는다. 예: `BottomTabBar.tsx`의 `` `/assets/icons/tab/tab-${icon}-${state}.svg` ``.
- `og-image.png`는 카카오톡·SNS 공유 썸네일이다. 외부 캐시가 남아 파일을 되돌려도 즉시 복구되지 않는다. 삭제·교체는 반드시 참조 수정과 같은 작업 단위로 한다.
- 압축 파일(`.zip`)·원본 소스는 저장소에 커밋 대상이 아니다. git은 커밋된 바이너리를 영구 보존하고, `public/` 하위는 배포 시 URL로 공개된다.
- 2026-08-05 실측: `public/` 60파일 97.5MB. **SVG 36개 전부가 PNG를 base64로 임베드한 래퍼**이며 임베드 비율이 약 75%다. 벡터 아이콘이 하나도 없다.

## 콘텐츠·명령 전달

- 콘텐츠 JSON은 `docs/source-json/<자격증>/` 하위 위치를 실제로 확인한 뒤 사용한다.
- **교재 페이지 인용 표기를 콘텐츠에 넣지 않는다.** 저작권과 무관하게 학습 콘텐츠 품질 문제다.
- 도표·그림·사진은 원본을 사용하지 않고 재제작한다. IIPA는 권리 확보 완료로 이 제약에서 제외된다.
- **설문을 학습자 분류 기제로 서술하지 않는다.** 설문은 콜드스타트 시드이며, 실제 분류는 행동 데이터가 수행한다. 특허 1의 진보성에 해당한다.

## 모델·추론 강도 선택

작업 유형으로 판단한다. 모델 라인업은 수시로 바뀌므로 **특정 모델명을 이 문서에 고정하지 않는다.**

| 작업 유형 | 추론 강도 |
|---|---|
| 단일 파일 소규모 수정, 원인이 명확한 정형 작업 | 낮음~중간 |
| 다중 파일 변경, 원인 불명 버그 추적 | 높음 |
| 아키텍처 결정, 데이터 구조 설계 | 최상위 |

- 모델 선택이 필요한 시점에는 `/model`로 현재 선택지를 직접 확인하고, 위 표 기준으로 판단한다.
- 기본 운용값은 **높음**이다. 위 표의 상·하단 구간에 해당할 때만 조정한다.
- 세대 교체 시 판단 기준은 유지하고, "현재 어떤 이름이 어느 구간에 해당하는지"만 그때그때 확인한다.
