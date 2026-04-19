'use client'

import { useRef } from 'react'
import { ChevronRight } from 'lucide-react'

// ================================================================
// 레슨 네비게이터 데이터 구조
// ================================================================

export interface LessonMeta {
  id: string
  title: string
}

export interface ChapterMeta {
  id: string
  title: string
  lessons: LessonMeta[]
}

export interface SubjectMeta {
  id: string
  title: string
  color: string
  icon: string
  comingSoon?: boolean
  chapters: ChapterMeta[]
}

export const NAVIGATOR_DATA: SubjectMeta[] = [
  {
    id: 'basic',
    title: 'Basic 해부학',
    color: '#378ADD',
    icon: '🦴',
    chapters: [
      { id: 'basic-c1', title: '기본 개념', lessons: [
        { id: 'basic-c1-l1', title: '신체 방향 용어' },
        { id: 'basic-c1-l2', title: '면과 축' },
        { id: 'basic-c1-l3', title: '관절 운동 용어' },
        { id: 'basic-c1-l4', title: '근육 분류 기초' },
      ]},
      { id: 'basic-c2', title: '근골격계 기초', lessons: [
        { id: 'basic-c2-l1', title: '뼈의 구조와 기능' },
        { id: 'basic-c2-l2', title: '관절의 종류' },
        { id: 'basic-c2-l3', title: '근육의 구조' },
        { id: 'basic-c2-l4', title: '건과 인대' },
      ]},
      { id: 'basic-c3', title: '주요 뼈 개요', lessons: [
        { id: 'basic-c3-l1', title: '척추 구조' },
        { id: 'basic-c3-l2', title: '골반 구조' },
        { id: 'basic-c3-l3', title: '상지 뼈대' },
        { id: 'basic-c3-l4', title: '하지 뼈대' },
      ]},
      { id: 'basic-c4', title: '주요 근육 개요', lessons: [
        { id: 'basic-c4-l1', title: '코어 근육군' },
        { id: 'basic-c4-l2', title: '하지 근육군' },
        { id: 'basic-c4-l3', title: '상지 근육군' },
        { id: 'basic-c4-l4', title: '경부 근육군' },
      ]},
      { id: 'basic-c5', title: 'Tonic vs Phasic', lessons: [
        { id: 'basic-c5-l1', title: 'Tonic 근육 특성' },
        { id: 'basic-c5-l2', title: 'Phasic 근육 특성' },
        { id: 'basic-c5-l3', title: '단축·약화 패턴' },
        { id: 'basic-c5-l4', title: '임상 적용' },
        { id: 'basic-c5-l5', title: '트레이닝 전략' },
      ]},
    ],
  },
  {
    id: 'functional',
    title: '기능 해부학',
    color: '#639922',
    icon: '💪',
    chapters: [
      { id: 'func-c1', title: '기시·정지 이해', lessons: [
        { id: 'func-c1-l1', title: '대퇴직근 기시·정지' },
        { id: 'func-c1-l2', title: '대둔근 기시·정지' },
        { id: 'func-c1-l3', title: '장요근 기시·정지' },
        { id: 'func-c1-l4', title: '햄스트링 기시·정지' },
      ]},
      { id: 'func-c2', title: '근육 작용·기능', lessons: [
        { id: 'func-c2-l1', title: '고관절 주요 근육 작용' },
        { id: 'func-c2-l2', title: '슬관절 주요 근육 작용' },
      ]},
      { id: 'func-c3', title: '컨디셔닝 적용', lessons: [
        { id: 'func-c3-l1', title: '마사지 적용 원칙' },
        { id: 'func-c3-l2', title: '스트레칭 적용 원칙' },
      ]},
    ],
  },
  {
    id: 'crossed',
    title: '교차증후군',
    color: '#E24B4A',
    icon: '⚡',
    chapters: [
      { id: 'cross-c1', title: 'LCS 개요', lessons: [
        { id: 'cross-c1-l1', title: 'LCS 단축·약화 근육' },
        { id: 'cross-c1-l2', title: 'LCS 트레이닝 접근' },
      ]},
      { id: 'cross-c2', title: 'UCS 개요', lessons: [
        { id: 'cross-c2-l1', title: 'UCS 단축·약화 근육' },
        { id: 'cross-c2-l2', title: 'UCS 트레이닝 접근' },
      ]},
    ],
  },
  {
    id: 'massage',
    title: '컨디셔닝 마사지',
    color: '#9B59B6',
    icon: '🤲',
    comingSoon: true,
    chapters: [],
  },
  {
    id: 'stretch',
    title: '컨디셔닝 스트레칭',
    color: '#F39C12',
    icon: '🧘',
    comingSoon: true,
    chapters: [],
  },
]

// ================================================================
// Props
// ================================================================

export interface NavigatorPosition {
  subjectId: string
  chapterId: string
  lessonId: string
}

interface LessonNavigatorProps {
  open: boolean
  current: NavigatorPosition
  onClose: () => void
  onNavigate: (pos: NavigatorPosition) => void
  // controlled 3-column selection
  selectedSubject: string
  selectedChapter: string
  selectedLesson: string
  onSelectSubject: (id: string) => void
  onSelectChapter: (id: string) => void
  onSelectLesson: (id: string) => void
}

// ================================================================
// Component
// ================================================================

export function LessonNavigator({
  open,
  current,
  onClose,
  onNavigate,
  selectedSubject,
  selectedChapter,
  selectedLesson,
  onSelectSubject,
  onSelectChapter,
  onSelectLesson,
}: LessonNavigatorProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  const subject = NAVIGATOR_DATA.find((s) => s.id === selectedSubject) ?? NAVIGATOR_DATA[0]
  const chapter = subject.chapters.find((c) => c.id === selectedChapter) ?? subject.chapters[0]

  // close on overlay click
  const handleOverlay = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  // breadcrumb display
  const curSubject = NAVIGATOR_DATA.find((s) => s.id === current.subjectId)
  const curChapter = curSubject?.chapters.find((c) => c.id === current.chapterId)
  const curLesson  = curChapter?.lessons.find((l) => l.id === current.lessonId)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onClick={handleOverlay}
    >
      {/* Panel slides down from top */}
      <div
        ref={panelRef}
        className="absolute top-0 left-0 right-0 bg-white rounded-b-3xl overflow-hidden shadow-2xl"
        style={{ maxHeight: '80vh' }}
      >
        {/* ── Header ── */}
        <div className="px-4 pt-4 pb-3 border-b border-[#F0F0EE]">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-[11px] text-[#ADADAD] mb-2 flex-wrap">
            <span>{curSubject?.title ?? '—'}</span>
            <ChevronRight size={10} />
            <span>{curChapter?.title ?? '—'}</span>
            <ChevronRight size={10} />
            <span className="text-[#1A1A1A] font-semibold">{curLesson?.title ?? '—'}</span>
          </div>
          <div className="text-[11px] text-[#6B6B6B]">레슨 선택</div>
        </div>

        {/* ── 3-column layout ── */}
        <div className="flex overflow-hidden" style={{ height: '44vh' }}>

          {/* Col 1: Subjects */}
          <div className="w-[30%] border-r border-[#F0F0EE] overflow-y-auto">
            {NAVIGATOR_DATA.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onSelectSubject(s.id)
                  if (!s.comingSoon) {
                    onSelectChapter(s.chapters[0]?.id ?? '')
                    onSelectLesson(s.chapters[0]?.lessons[0]?.id ?? '')
                  }
                }}
                disabled={s.comingSoon}
                className={`w-full text-left px-2.5 py-3 border-b border-[#F8F8F8] ${
                  selectedSubject === s.id
                    ? 'bg-[#F0F7FF]'
                    : 'hover:bg-[#FAFAFA]'
                } ${s.comingSoon ? 'opacity-40' : ''}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px]">{s.icon}</span>
                  <span className={`text-[10px] font-semibold leading-tight ${
                    selectedSubject === s.id ? 'text-[#378ADD]' : 'text-[#1A1A1A]'
                  }`}>
                    {s.title}
                  </span>
                </div>
                {s.comingSoon && (
                  <span className="text-[8px] text-[#ADADAD] block mt-0.5">Coming Soon</span>
                )}
              </button>
            ))}
          </div>

          {/* Col 2: Chapters */}
          <div className="w-[35%] border-r border-[#F0F0EE] overflow-y-auto">
            {subject.chapters.map((ch) => (
              <button
                key={ch.id}
                onClick={() => {
                  onSelectChapter(ch.id)
                  onSelectLesson(ch.lessons[0]?.id ?? '')
                }}
                className={`w-full text-left px-2.5 py-3 border-b border-[#F8F8F8] ${
                  selectedChapter === ch.id
                    ? 'bg-[#F0F7FF]'
                    : 'hover:bg-[#FAFAFA]'
                }`}
              >
                <span className={`text-[10px] font-medium leading-tight ${
                  selectedChapter === ch.id ? 'text-[#378ADD]' : 'text-[#1A1A1A]'
                }`}>
                  {ch.title}
                </span>
                <div className="text-[9px] text-[#ADADAD] mt-0.5">{ch.lessons.length}레슨</div>
              </button>
            ))}
          </div>

          {/* Col 3: Lessons */}
          <div className="flex-1 overflow-y-auto">
            {(chapter?.lessons ?? []).map((ls, idx) => (
              <button
                key={ls.id}
                onClick={() => onSelectLesson(ls.id)}
                className={`w-full text-left px-2.5 py-3 border-b border-[#F8F8F8] ${
                  selectedLesson === ls.id
                    ? 'bg-[#378ADD]/10'
                    : 'hover:bg-[#FAFAFA]'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-[#ADADAD] flex-shrink-0">{idx + 1}</span>
                  <span className={`text-[10px] font-medium leading-tight ${
                    selectedLesson === ls.id ? 'text-[#378ADD]' : 'text-[#1A1A1A]'
                  }`}>
                    {ls.title}
                  </span>
                </div>
                {ls.id === current.lessonId && (
                  <span className="text-[8px] text-[#E24B4A] font-bold mt-0.5 block">현재 위치</span>
                )}
              </button>
            ))}
          </div>

        </div>

        {/* ── Footer: Go button ── */}
        <div className="px-4 py-3 border-t border-[#F0F0EE] flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-[#E5E5E5] rounded-xl text-[13px] font-medium text-[#6B6B6B]"
          >
            취소
          </button>
          <button
            onClick={() => {
              onNavigate({ subjectId: selectedSubject, chapterId: selectedChapter, lessonId: selectedLesson })
              onClose()
            }}
            className="flex-1 py-3 bg-[#378ADD] rounded-xl text-[13px] font-bold text-white"
          >
            이 레슨으로 이동
          </button>
        </div>
      </div>
    </div>
  )
}
