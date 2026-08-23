// 대시보드 공용 타입·상수 정의
// page.tsx에서 추출 (원본 유지, 복사본)

export type Tab = 'home' | 'classroom' | 'exam' | 'profile'

/* ── localStorage 키 상수 ──────────────────────────────────────────── */
export const SUBJECTS_KEY = 'kinepia_selected_subjects'
export const CERT_KEY     = 'kinepia_selected_cert'

/* PM이 access_codes.label과 certifications.id를 확정하면 아래 두 값만 교체한다.
 * 빈 문자열인 동안 보디빌딩 데모 전용 진입 버튼은 노출되지 않는다.
 */
export const BODYBUILDING_DEMO_ACCESS_CODE_LABEL = ''
export const BODYBUILDING_DEMO_CERT_ID = ''

export const ADMIN_EMAILS = ['shotace@naver.com', 'prehabex@naver.com']

export const CERT_LABELS: Record<string, string> = {
  'health-exercise-manager':       '운동건강관리사',
  'sports-instructor-2':           '2급 생활스포츠지도사',
  'sports-instructor':             '생활스포츠지도사',
  'exercise-prescriptionist':      '건강운동관리사',
  'sports-instructor-2-written':   '2급 생활스포츠지도사 필기',
  'sports-instructor-2-practical': '2급 생활스포츠지도사 구술/실기',
}

export const CERT_ICONS: Record<string, string> = {
  '건강운동관리사':                '🏅',
  '2급 생활스포츠지도사 필기':      '📝',
  '2급 생활스포츠지도사 구술/실기': '🏋️',
}

// 구술/실기 보디빌딩 과목 → courseId 매핑
export const BODYBUILD_COURSES: Record<string, string> = {
  '도핑 규정':         'b28e78c8-8443-4013-bfef-dbe655c72994',
  '보디빌딩1':         '13f8cdb4-651e-4eba-9cfa-571465cbc905',
  '보디빌딩2':         '67cfd191-fc7f-4d57-9124-096ac4e8c40c',
  '생활체육 지도 방법': 'add57a42-adb5-4b75-9960-0ccc409c0341',
  '스포츠 인권':        '24885dc7-5442-481e-81fc-d7a222f76a25',
  '응급처치':           '947a8cf1-1ed8-4dcb-9379-263000ef49cf',
  '협회 규정':          '2c72f373-253d-41fc-b1d5-e156f485043e',
}

// 구술/실기 보디빌딩 과목 → subjectId 매핑
export const BODYBUILD_SUBJECTS: Record<string, string> = {
  '도핑 규정':         '6944e483-027e-4009-93e9-5826ac992d8a',
  '보디빌딩1':         '054b7ae7-59df-4f65-b357-5d64d7617cb5',
  '보디빌딩2':         '054b7ae7-59df-4f65-b357-5d64d7617cb5',
  '생활체육 지도 방법': '7b8b495b-5897-4de9-acf8-0557c5938ad2',
  '스포츠 인권':        '77119580-8805-4865-a705-65d515017771',
  '응급처치':           'b967339b-0195-4b7e-bceb-6ff1f4fc60f9',
  '협회 규정':          '01340b0e-af8a-4b8a-93bc-6ae11b3b2c54',
}

// 자격증별 필수/선택 과목 구분 (건강운동관리사는 certification_subjects API로 동적 조회)
export const REQUIRED_SUBJECTS: Record<string, string[]> = {
  'sports-instructor-2': [
    '스포츠심리학', '운동생리학', '스포츠교육학', '운동역학',
    '한국체육사', '스포츠사회학',
  ],
  'sports-instructor': [
    '스포츠심리학', '운동생리학', '스포츠교육학', '운동역학',
    '한국체육사', '스포츠사회학',
  ],
}

export const SUBJECT_META: Record<string, { icon: string; desc: string }> = {
  '운동생리학':    { icon: '🫀', desc: '심폐기능·에너지 대사' },
  '기능해부학':    { icon: '🦴', desc: '근육·뼈대·관절 구조' },
  '건강·체력평가': { icon: '📊', desc: '체력검사·측정·평가' },
  '운동처방론':    { icon: '📋', desc: 'FITT 원칙·운동 처방' },
  '운동부하검사':  { icon: '🏃', desc: '심전도·부하 프로토콜' },
  '운동상해':      { icon: '🩹', desc: '손상·응급처치·재활' },
  '병태생리학':    { icon: '🔬', desc: '질환 발생 원리' },
  '스포츠심리학':  { icon: '🧠', desc: '동기·루틴·심리기술' },
  '한국체육사':    { icon: '🏛️', desc: '한국 체육의 역사' },
  '스포츠교육학':  { icon: '📚', desc: '교수법·코칭 이론' },
  '스포츠윤리':    { icon: '⚖️', desc: '페어플레이·반도핑' },
  '운동역학':      { icon: '⚙️', desc: '운동의 물리적 원리' },
  '스포츠사회학':  { icon: '🏟️', desc: '스포츠와 사회' },
  '도핑 규정':        { icon: '💊', desc: '도핑 검사·금지 약물' },
  '보디빌딩 경기 규정': { icon: '🏆', desc: '경기 규정·심사 기준' },
  '복장 및 포징 규정': { icon: '👔', desc: '복장·포징 규정' },
  '생활체육 지도 방법': { icon: '🎽', desc: '지도법·코칭 이론' },
  '스포츠 인권':      { icon: '⚖️', desc: '인권·페어플레이' },
  '운동영양학':       { icon: '🥩', desc: '영양소·식이 전략' },
  '응급처치':         { icon: '🚑', desc: '응급처치·안전 관리' },
  '협회 규정':        { icon: '📋', desc: '협회 규정·절차' },
}

export const CERT_EXAM_DATES: Record<number, string> = {
  2026: '2026-06-13',
  2027: '2027-06-12',
  2028: '2028-06-14',
}

// 오늘(포함) 이후로 가장 가까운 시험일 추천. 매핑된 미래 일정이 없으면 null.
export const getNextExamDate = (): string | null => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcoming = Object.values(CERT_EXAM_DATES)
    .filter((d) => new Date(d) >= today)
    .sort()
  return upcoming[0] ?? null
}


export interface ChapterStat {
  chapter_id: string
  avg_score: number
  wrong_rate: number
  total_attempts: number
  last_attempt_at: string | null
  latest_score?: number | null
  best_score?: number | null
  test_attempts?: number
  lesson_completed?: boolean
}

export interface VideoBookmark {
  id: string
  video_url: string
  video_title: string
  video_thumbnail: string
}

export interface SubjectCard {
  name: string
  icon: string
  desc: string
  subjectId: string | null
}

export interface ActivityItem {
  chapter_id: string
  chapter_title: string
  subject_name: string
  date: string | null
  score: number
  bestScore: number | null
}

export interface TodayChapter {
  chapterId: string
  title: string
  subjectName: string
  subjectId: string
  total: number
  completed: number
}

export interface UserCertification {
  id: string
  user_id: string
  cert_id: string
  cert_label: string
  subjects: string[]
  exam_type: string
  is_active: boolean
  order_index: number
  added_at: string
  last_studied_at: string | null
}

export interface OralExamRegistration {
  id: string
  user_id: string
  exam_date: string
  ticket_number: number
  start_time: string
  slot_number: number
  week_number: number
  certification_id: string
  is_completed: boolean
  created_at: string
}

// ── 2026-06-24 추가 (P0-9): 이용 코드 결과 타입 + 날짜 포맷 ──
export interface CodeInfo {
  code: string
  expiresAt: string | null
}
export interface CodeResultData {
  status: 'upgraded' | 'kept' | 'duplicate'
  label: string | null
  enteredCode: CodeInfo
  activeCode: CodeInfo
  prevCode: CodeInfo | null
}
export const fmtCodeDate = (s: string | null | undefined): string => {
  if (!s) return ''
  const d = new Date(s)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
