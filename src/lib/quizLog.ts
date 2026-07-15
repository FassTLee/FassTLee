// quiz_performance_logs.question_type 정수 코드 정의
// ────────────────────────────────────────────────────────────────
// 이 컬럼은 DB에서 integer 타입이라 값 자체가 자기설명이 안 됩니다.
// 따라서 이 맵이 "정수 ↔ 의미"의 유일한 정의처입니다.
// 값을 바꾸거나 새 타입을 붙일 때는 반드시 여기를 기준으로 하세요.
//
//   1 = mini_quiz     학습 슬라이드3 미니퀴즈 (현재 사용)
//   2 = chapter_test  챕터 테스트 (예약, 미사용)
//   3 = mock_exam     모의고사   (예약, 미사용)
//   4 = oral_exam     구술 시험   (예약, 미사용)
//
// 프론트/호출부는 위 문자열 키를 body.questionType 으로 보내고,
// quiz-performance-log route가 이 맵을 통해 정수로 변환해 저장합니다.
export const QUESTION_TYPE = {
  mini_quiz:    1, // 학습 슬라이드3 미니퀴즈 (현재 사용)
  chapter_test: 2, // 챕터 테스트 (예약, 미사용)
  mock_exam:    3, // 모의고사 (예약, 미사용)
  oral_exam:    4, // 구술 시험 (예약, 미사용)
} as const

export type QuestionTypeKey = keyof typeof QUESTION_TYPE

// 문자열 키 → 정수 코드 변환. 알 수 없는 키면 undefined (route에서 400 처리).
export function questionTypeCode(key: unknown): number | undefined {
  if (typeof key === 'string' && key in QUESTION_TYPE) {
    return QUESTION_TYPE[key as QuestionTypeKey]
  }
  return undefined
}
