export interface VideoMeta {
  src:   string
  title: string
  desc:  string
}

export const ALL_VIDEOS: VideoMeta[] = [
  { src: '/videos/shorts/shorts-demo-01.mp4', title: '추천 영상 1', desc: '건강운동관리사 핵심 개념 요약' },
  { src: '/videos/shorts/shorts-demo-02.mp4', title: '추천 영상 2', desc: '운동생리학 빈출 문제 풀이' },
  { src: '/videos/shorts/shorts-demo-03.mp4', title: '추천 영상 3', desc: '기능해부학 핵심 포인트' },
  { src: '/videos/shorts/shorts-demo-04.mp4', title: '추천 영상 4', desc: '운동처방론 실전 대비' },
  // 추가 영상은 아래에 동일 형식으로 추가
  // { src: '/videos/shorts/shorts-demo-05.mp4', title: '추천 영상 5', desc: '...' },
  // { src: '/videos/shorts/shorts-demo-06.mp4', title: '추천 영상 6', desc: '...' },
]

export const HOME_VIDEO_COUNT = 3
