// ================================================================
// Education 콘텐츠 구조 타입 정의
// ================================================================

export type CourseCategory =
  | 'anatomy_basic'
  | 'anatomy_functional'
  | 'conditioning_massage'
  | 'conditioning_stretch'

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | null

export type LessonType = 'daily_snap' | 'full_lesson' | 'test'

export type CoursePhase = 'mvp' | 'phase2' | 'phase3'

export interface Course {
  id: string
  title: string
  description: string
  category: CourseCategory
  phase: CoursePhase
  level: CourseLevel
  xpReward: number
  orderIndex: number
  isLocked: boolean
  unlockCondition?: string
  thumbnailUrl?: string
  lessons?: Lesson[]
}

export interface Lesson {
  id: string
  courseId: string
  title: string
  contentJson?: LessonContent
  lessonType: LessonType
  xpReward: number
  orderIndex: number
  durationMinutes: number
  isRequired: boolean
}

// ─── 레슨 콘텐츠 JSON 구조 ───────────────────────────────────────

export interface LessonContent {
  blocks: ContentBlock[]
}

export type ContentBlock =
  | TextBlock
  | ImageBlock
  | QuizBlock
  | ChecklistBlock
  | AnatomyCard
  | VideoBlock

export interface TextBlock {
  type: 'text'
  heading?: string
  body: string
  highlight?: boolean   // 형광펜 효과 (초급)
}

export interface ImageBlock {
  type: 'image'
  url: string
  caption?: string
  alt: string
  protected?: boolean   // 우클릭 방지 대상
}

export interface VideoBlock {
  type: 'video'
  url: string
  thumbnail?: string
  duration: number      // 초
  caption?: string
}

export interface QuizBlock {
  type: 'quiz'
  question: string
  questionType: 'A' | 'B'
  // A: 이미지 선택 (anatomy image → 근육명/기시·정지)
  // B: 텍스트 객관식 (기능 이해 확인)
  imageUrl?: string     // questionType A 전용
  options: QuizOption[]
  correctIndex: number
  explanation?: string
}

export interface QuizOption {
  text: string
  imageUrl?: string    // 이미지 선택형 옵션
}

export interface ChecklistBlock {
  type: 'checklist'
  items: string[]
  requiredAll?: boolean
}

export interface AnatomyCard {
  type: 'anatomy_card'
  muscleName: string
  muscleNameEn: string
  origin: string        // 기시
  insertion: string     // 정지
  action: string        // 작용
  caution?: string      // 주의사항
  imageUrl?: string
  conditioningNote?: string   // 컨디셔닝 적용 (상급)
}

// ================================================================
// 정적 콘텐츠 데이터 (MVP 하드코딩)
// ================================================================

export const COURSES: Course[] = [
  // ─── 1. 기초 해부학 ─────────────────────────────────────────
  {
    id: 'ab-01',
    title: '신체 구조 기본 개념',
    description: '뼈대·근육·관절의 기초 이해',
    category: 'anatomy_basic',
    phase: 'mvp',
    level: null,
    xpReward: 10,
    orderIndex: 1,
    isLocked: false,
  },
  {
    id: 'ab-02',
    title: '뼈대·근육·관절 기초',
    description: '주요 뼈대와 근육군의 위치 파악',
    category: 'anatomy_basic',
    phase: 'mvp',
    level: null,
    xpReward: 10,
    orderIndex: 2,
    isLocked: false,
  },

  // ─── 2. 기능 해부학 ─────────────────────────────────────────
  {
    id: 'af-01',
    title: '기시 & 정지 & 움직임',
    description: '주요 근육의 기시·정지·작용 이해',
    category: 'anatomy_functional',
    phase: 'mvp',
    level: 'beginner',
    xpReward: 15,
    orderIndex: 3,
    isLocked: false,
  },
  {
    id: 'af-02',
    title: '작용 & 주의사항',
    description: '근육 작용 심화 + 트레이닝 주의사항',
    category: 'anatomy_functional',
    phase: 'mvp',
    level: 'intermediate',
    xpReward: 20,
    orderIndex: 4,
    isLocked: false,
  },
  {
    id: 'af-03',
    title: '컨디셔닝 적용',
    description: '마사지·스트레칭 연계 고급 적용',
    category: 'anatomy_functional',
    phase: 'mvp',
    level: 'advanced',
    xpReward: 30,
    orderIndex: 5,
    isLocked: true,
    unlockCondition: 'af-02-test-pass',
  },

  // ─── 3. 컨디셔닝 마사지 ──────────────────────────────────────
  {
    id: 'cm-01',
    title: '마사지 테크닉 기초',
    description: '올바른 자세와 압력 포인트',
    category: 'conditioning_massage',
    phase: 'mvp',
    level: null,
    xpReward: 20,
    orderIndex: 6,
    isLocked: true,
    unlockCondition: 'af-03-complete',
  },
  {
    id: 'cm-02',
    title: '부위 & 증상별 마사지',
    description: '증상 분석 후 마사지 시퀀스 구성',
    category: 'conditioning_massage',
    phase: 'mvp',
    level: null,
    xpReward: 25,
    orderIndex: 7,
    isLocked: true,
    unlockCondition: 'cm-01-complete',
  },

  // ─── 4. 컨디셔닝 스트레칭 ────────────────────────────────────
  {
    id: 'cs-01',
    title: '스트레칭 테크닉 기초',
    description: '패시브/액티브 스트레칭 차이와 적용',
    category: 'conditioning_stretch',
    phase: 'mvp',
    level: null,
    xpReward: 20,
    orderIndex: 8,
    isLocked: true,
    unlockCondition: 'af-03-complete',
  },
  {
    id: 'cs-02',
    title: '부위 & 증상별 스트레칭',
    description: '증상별 스트레칭 프로그램 설계',
    category: 'conditioning_stretch',
    phase: 'mvp',
    level: null,
    xpReward: 25,
    orderIndex: 9,
    isLocked: true,
    unlockCondition: 'cs-01-complete',
  },
]

// ─── 카테고리 메타데이터 ─────────────────────────────────────────

export const CATEGORY_META: Record<CourseCategory, {
  label: string
  icon: string
  color: string
  bg: string
  description: string
}> = {
  anatomy_basic: {
    label: '기초 해부학',
    icon: '🦴',
    color: '#378ADD',
    bg: '#EFF6FF',
    description: '신체 구조의 기초를 탄탄히',
  },
  anatomy_functional: {
    label: '기능 해부학',
    icon: '💪',
    color: '#639922',
    bg: '#F0FDF4',
    description: '근육의 기능과 움직임 원리',
  },
  conditioning_massage: {
    label: '컨디셔닝 마사지',
    icon: '🤲',
    color: '#E24B4A',
    bg: '#FFF1F1',
    description: '증상별 마사지 테크닉 실습',
  },
  conditioning_stretch: {
    label: '컨디셔닝 스트레칭',
    icon: '🧘',
    color: '#9B59B6',
    bg: '#FAF5FF',
    description: '패시브/액티브 스트레칭 적용',
  },
}

export const LEVEL_META: Record<string, { label: string; color: string }> = {
  beginner: { label: '🟢 초급', color: '#639922' },
  intermediate: { label: '🟡 중급', color: '#E2A84A' },
  advanced: { label: '🔵 상급', color: '#378ADD' },
}

// ─── 게이미피케이션 상수 ─────────────────────────────────────────

export const XP_REWARDS = {
  DAILY_SNAP: 5,
  LESSON_COMPLETE: 10,
  TEST_PASS: 20,         // 70% 이상
  TEST_PERFECT: 50,      // 100%
  STREAK_7: 30,
  STREAK_30: 100,
} as const

export const LEVEL_NAMES: Record<number, string> = {
  1: '해부학 입문',
  2: '해부학 입문',
  3: '해부학 입문',
  4: '해부학 입문',
  5: '해부학 입문',
  6: '기능 해부학 탐험가',
  7: '기능 해부학 탐험가',
  8: '기능 해부학 탐험가',
  9: '기능 해부학 탐험가',
  10: '기능 해부학 탐험가',
  11: '컨디셔닝 전문가',
  12: '컨디셔닝 전문가',
  13: '컨디셔닝 전문가',
  14: '컨디셔닝 전문가',
  15: '컨디셔닝 전문가',
}

export function getLevelName(level: number): string {
  if (level >= 16) return '마스터 트레이너'
  return LEVEL_NAMES[level] ?? '마스터 트레이너'
}

export function getXPForNextLevel(level: number): number {
  return level * 100  // 레벨 1→2: 100xp, 2→3: 200xp ...
}

export const BADGE_META: Record<string, { name: string; icon: string; desc: string }> = {
  first_lesson:       { name: '첫 학습 완료', icon: '🌟', desc: '첫 번째 레슨을 완료했습니다' },
  streak_7:           { name: '7일 스트릭', icon: '🔥', desc: '7일 연속 학습을 달성했습니다' },
  streak_30:          { name: '30일 스트릭', icon: '🌋', desc: '30일 연속 학습을 달성했습니다' },
  chapter_complete:   { name: '챕터 완료', icon: '📚', desc: '한 챕터를 완주했습니다' },
  perfect_test:       { name: '테스트 만점', icon: '💯', desc: '테스트에서 100점을 받았습니다' },
  leaderboard_top10:  { name: 'TOP 10', icon: '🏆', desc: '리더보드 상위 10위에 진입했습니다' },
}
