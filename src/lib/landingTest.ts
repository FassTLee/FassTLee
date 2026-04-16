// ================================================================
// 랜딩 테스트 — 5문제 (유형 A 3개 + 유형 B 2개)
// ================================================================

export type QuestionType = 'A' | 'B'

export interface TestQuestion {
  id: string
  type: QuestionType
  question: string
  imageUrl?: string        // 유형 A: 해부학 이미지
  options: string[]
  correctIndex: number
  explanation: string
  weakArea?: string        // 취약 파트 태깅
}

export const LANDING_QUESTIONS: TestQuestion[] = [
  // ─── 유형 A — 이미지 선택 (해부학 이미지 → 근육명 선택) ─────
  {
    id: 'q1',
    type: 'A',
    question: '아래 이미지에서 화살표가 가리키는 근육의 이름은?',
    imageUrl: '/images/anatomy/iliopsoas.svg',
    options: ['대둔근', '장요근', '대퇴직근', '봉공근'],
    correctIndex: 1,
    explanation: '장요근(Iliopsoas)은 장골근과 대요근의 합쳐진 근육으로, 고관절 굴곡의 주동근입니다.',
    weakArea: '기능 해부학 — 장요근',
  },
  {
    id: 'q2',
    type: 'A',
    question: '다음 이미지에서 표시된 근육의 정지(Insertion) 위치는?',
    imageUrl: '/images/anatomy/gluteus_max.svg',
    options: ['장골 후면', '대퇴골 둔근조면', '경골 조면', '슬개골'],
    correctIndex: 1,
    explanation: '대둔근의 정지점은 대퇴골 둔근조면(Gluteal tuberosity)과 장경인대입니다.',
    weakArea: '기능 해부학 — 대둔근',
  },
  {
    id: 'q3',
    type: 'A',
    question: '아래 이미지의 근육이 단축될 때 나타나는 자세 변화는?',
    imageUrl: '/images/anatomy/rectus_femoris.svg',
    options: ['후방 골반 경사', '전방 골반 경사', '측방 기울기', '변화 없음'],
    correctIndex: 1,
    explanation: '대퇴직근 단축 시 전방 골반 경사(Anterior Pelvic Tilt)가 증가하여 요통을 유발할 수 있습니다.',
    weakArea: '기능 해부학 — 대퇴직근',
  },

  // ─── 유형 B — 텍스트 객관식 (기능 이해 확인) ────────────────
  {
    id: 'q4',
    type: 'B',
    question: '하지 교차증후군(Lower Crossed Syndrome)에서 약화되는 근육 그룹은?',
    options: ['장요근, 척추기립근', '대둔근, 복근', '대퇴직근, 햄스트링', '이상근, 대퇴근막장근'],
    correctIndex: 1,
    explanation: '하지 교차증후군에서는 대둔근과 복근이 약화되고, 장요근과 척추기립근이 단축됩니다.',
    weakArea: '기초 해부학 — 교차증후군',
  },
  {
    id: 'q5',
    type: 'B',
    question: '패시브 스트레칭 시 적절한 유지 시간은?',
    options: ['5~10초', '15~20초', '30~60초', '2분 이상'],
    correctIndex: 2,
    explanation: '패시브 스트레칭은 30~60초 유지 시 근육의 점탄성 변형이 충분히 일어납니다. 10초 미만은 효과가 미미합니다.',
    weakArea: '컨디셔닝 스트레칭',
  },
]

export interface TestResult {
  score: number
  totalQuestions: number
  answers: number[]      // 선택한 옵션 인덱스
  weakAreas: string[]
  percentage: number
}

export function evaluateTest(answers: (number | null)[]): TestResult {
  let score = 0
  const weakAreas: string[] = []

  LANDING_QUESTIONS.forEach((q, i) => {
    if (answers[i] === q.correctIndex) {
      score++
    } else if (q.weakArea) {
      weakAreas.push(q.weakArea)
    }
  })

  return {
    score,
    totalQuestions: LANDING_QUESTIONS.length,
    answers: answers.map((a) => a ?? -1),
    weakAreas,
    percentage: Math.round((score / LANDING_QUESTIONS.length) * 100),
  }
}

export function getResultMessage(percentage: number): {
  title: string
  subtitle: string
  emoji: string
  color: string
} {
  if (percentage >= 80) return {
    title: '훌륭한 해부학 지식!',
    subtitle: 'Kinepia로 더 깊이 학습해 Professional 트레이너로 성장하세요.',
    emoji: '🏆',
    color: '#639922',
  }
  if (percentage >= 60) return {
    title: '좋은 출발점!',
    subtitle: '취약한 부분을 Kinepia Education으로 보완하면 실력이 크게 향상됩니다.',
    emoji: '💪',
    color: '#378ADD',
  }
  return {
    title: '성장 가능성이 큽니다!',
    subtitle: 'Kinepia의 체계적인 커리큘럼으로 해부학부터 차근차근 시작해보세요.',
    emoji: '📖',
    color: '#E24B4A',
  }
}
