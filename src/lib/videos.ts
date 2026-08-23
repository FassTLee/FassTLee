/**
 * 추천 영상 메타데이터 중앙 관리 파일.
 * - 영상 파일명은 반드시 영문/숫자만 사용 (예: shorts-demo-01.mp4)
 * - 제목(title)과 설명(description)은 이 파일에서만 수정
 */

export interface VideoMeta {
  src:         string
  title:       string
  description: string
}

export const ALL_VIDEOS: VideoMeta[] = [
  {
    src:         '/videos/shorts/shorts-demo-01.mp4',
    title:       '운동해도 근육 안붙는 진짜 이유',
    description: '운동 효과를 극대화하는 핵심 원리',
  },
  {
    src:         '/videos/shorts/shorts-demo-02.mp4',
    title:       '혈당 지킴이 추천 음식 3가지',
    description: '혈당 관리에 도움이 되는 음식',
  },
  {
    src:         '/videos/shorts/shorts-demo-03.mp4',
    title:       '고단백 식단이 신장 파괴자?',
    description: '고단백 식단의 진실과 올바른 섭취법',
  },
  {
    src:         '/videos/shorts/shorts-demo-04.mp4',
    title:       '거북목 가속 노화의 주범',
    description: '거북목 교정과 예방법',
  },
  {
    src:         '/videos/shorts/shorts-demo-05.mp4',
    title:       '먹기만해도 살빠지는 음식?',
    description: '다이어트에 효과적인 음식의 비밀',
  },
  {
    src:         '/videos/shorts/shorts-demo-06.mp4',
    title:       '힘 안들이고 살빠지는 습관?',
    description: '일상에서 실천하는 체중 관리 습관',
  },
  // DEMO — 2026-08-25 미팅용. 미팅 후 이 블록만 삭제한다.
  {
    src:         '/videos/shorts/shorts-demo-07.mp4',
    title:       '보디빌딩 규정포즈 — 남자',
    description: '남자 규정포즈의 순서와 핵심 동작',
  },
  {
    src:         '/videos/shorts/shorts-demo-08.mp4',
    title:       '보디빌딩 규정포즈 — 여자',
    description: '여자 규정포즈의 순서와 핵심 동작',
  },
  // DEMO — 2026-08-25 미팅용. 미팅 후 이 블록만 삭제한다.
]

export const HOME_VIDEO_COUNT = 3
