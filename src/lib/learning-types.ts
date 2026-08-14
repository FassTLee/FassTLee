/**
 * 학습 유형 단일 소스.
 * 2026-08-12 명칭 3층 개편. 구 2값은 profiles.learning_style_legacy 에 보존됨.
 */

export const LEARNING_TYPE_KEYS = ['spotter', 'planner', 'repeater', 'explorer'] as const
export type LearningType = (typeof LEARNING_TYPE_KEYS)[number]

export interface LearningTypeMeta {
  key: LearningType
  label: string
  badge: string
  color: string
  lessonMode: 'concise' | 'detailed'
  icon: string
  desc: string
  tips: { icon: string; text: string }[]
}

export const LEARNING_TYPES: Record<LearningType, LearningTypeMeta> = {
  spotter: {
    key: 'spotter',
    label: '직관형',
    badge: '감이 빠른 학습자',
    color: '#F5A623',
    lessonMode: 'concise',
    icon: '/assets/icons/learning-type/learning-type-spotter.svg',
    desc: '전체를 먼저 훑어 요점을 잡아요. 설명을 끝까지 보지 않아도 흐름을 파악합니다.',
    tips: [
      { icon: '⚡', text: '핵심 요약을 먼저 제시' },
      { icon: '🗺', text: '도표·구조도 중심 자료' },
      { icon: '🎯', text: '감이 어긋난 지점만 되짚기' },
    ],
  },
  planner: {
    key: 'planner',
    label: '계획형',
    badge: '리듬을 지키는 학습자',
    color: '#9B59B6',
    lessonMode: 'detailed',
    icon: '/assets/icons/learning-type/learning-type-planner.svg',
    desc: '순서를 정해 단계별로 나아가요. 정한 분량을 지키며 꾸준히 쌓아갑니다.',
    tips: [
      { icon: '📅', text: '주간 학습 스케줄 제시' },
      { icon: '✅', text: '진도 체크리스트 제공' },
      { icon: '📊', text: '달성률 리포트' },
    ],
  },
  repeater: {
    key: 'repeater',
    label: '반복형',
    badge: '되새겨 다지는 학습자',
    color: '#378ADD',
    lessonMode: 'concise',
    icon: '/assets/icons/learning-type/learning-type-repeater.svg',
    desc: '여러 번 되짚으며 익혀요. 짧고 반복적인 노출로 기억을 다집니다.',
    tips: [
      { icon: '🔁', text: '간격 반복 복습 배치' },
      { icon: '🃏', text: '플래시카드 방식 정리' },
      { icon: '✨', text: '핵심 키워드 강조' },
    ],
  },
  explorer: {
    key: 'explorer',
    label: '탐구형',
    badge: '깊이 파고드는 학습자',
    color: '#639922',
    lessonMode: 'detailed',
    icon: '/assets/icons/learning-type/learning-type-explorer.svg',
    desc: '원리와 이유를 끝까지 따져봐요. 상세한 설명으로 깊이 있는 이해를 추구합니다.',
    tips: [
      { icon: '📖', text: '상세 설명 전체 제공' },
      { icon: '🔍', text: '원리·이유 중심 해설' },
      { icon: '🔗', text: '개념 간 연결고리 학습' },
    ],
  },
}

export function isLearningType(v: unknown): v is LearningType {
  return typeof v === 'string' && (LEARNING_TYPE_KEYS as readonly string[]).includes(v)
}

/** 미지값(구 2값 포함)은 null 반환 → 미분류 처리 */
export function getLearningTypeMeta(v: string | null | undefined): LearningTypeMeta | null {
  return isLearningType(v) ? LEARNING_TYPES[v] : null
}
