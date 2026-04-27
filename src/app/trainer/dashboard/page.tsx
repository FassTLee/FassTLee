'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronRight, Plus } from 'lucide-react'

const SUBJECTS_KEY = 'kinepia_selected_subjects'

const SUBJECT_META: Record<string, { icon: string; desc: string }> = {
  '운동생리학':    { icon: '🫀', desc: '심폐기능·에너지 대사' },
  '기능해부학':    { icon: '🦴', desc: '근육·뼈대·관절 구조' },
  '건강·체력평가': { icon: '📊', desc: '체력검사·측정·평가' },
  '운동처방론':    { icon: '📋', desc: 'FITT 원칙·운동 처방' },
  '운동부하검사':  { icon: '🏃', desc: '심전도·부하 프로토콜' },
  '운동상해':      { icon: '🩹', desc: '손상·응급처치·재활' },
  '병태생리학':    { icon: '🔬', desc: '질환 발생 원리' },
  '스포츠심리학':  { icon: '🧠', desc: '동기·루틴·심리기술' },
}

interface SubjectCard {
  name: string
  icon: string
  desc: string
  subjectId: string | null
  chapterCount: number
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [cards, setCards] = useState<SubjectCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    loadDashboard()
  }, [status, router])

  const loadDashboard = async () => {
    // 선택된 과목 불러오기 (localStorage → DB 순)
    let selectedNames: string[] = []
    const cached = localStorage.getItem(SUBJECTS_KEY)
    if (cached) {
      try { selectedNames = JSON.parse(cached) } catch { /* ignore */ }
    }
    if (selectedNames.length === 0) {
      try {
        const res = await fetch('/api/v1/selected-subjects')
        const data = await res.json()
        if (Array.isArray(data.selected_subjects)) {
          selectedNames = data.selected_subjects
          localStorage.setItem(SUBJECTS_KEY, JSON.stringify(selectedNames))
        }
      } catch { /* ignore */ }
    }

    if (selectedNames.length === 0) {
      router.replace('/select-subject')
      return
    }

    // 각 과목별 DB 정보 조회
    const { data: dbSubjects } = await supabase
      .from('subjects')
      .select('id, name')
      .in('name', selectedNames)

    const cardData: SubjectCard[] = await Promise.all(
      selectedNames.map(async (name) => {
        const meta = SUBJECT_META[name] ?? { icon: '📚', desc: '' }
        const db = dbSubjects?.find((d) => d.name === name) ?? null
        let chapterCount = 0
        if (db) {
          const { data: courses } = await supabase
            .from('courses')
            .select('id')
            .eq('subject_id', db.id)
          if (courses?.length) {
            const { count } = await supabase
              .from('chapters')
              .select('id', { count: 'exact', head: true })
              .in('course_id', courses.map((c) => c.id))
            chapterCount = count ?? 0
          }
        }
        return { name, icon: meta.icon, desc: meta.desc, subjectId: db?.id ?? null, chapterCount }
      })
    )
    setCards(cardData)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const name = session?.user?.name?.split(' ')[0] ?? '수강생'

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      {/* 헤더 */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-5">
        <p className="text-[12px] text-[#ADADAD] mb-0.5">건강운동관리사</p>
        <h1 className="text-[22px] font-black text-[#1A1A1A]">{name}님의 학습</h1>
        <p className="text-[13px] text-[#6B6B6B] mt-1">{cards.length}개 과목 수강 중</p>
      </div>

      <div className="p-4 space-y-3">
        {cards.map((card) => (
          <button
            key={card.name}
            onClick={() => {
              if (card.subjectId) router.push(`/chapters/${card.subjectId}`)
            }}
            disabled={!card.subjectId}
            className="w-full bg-white rounded-2xl border border-[#E5E5E5] p-4 text-left flex items-center gap-4 active:bg-[#F5F5F3] disabled:opacity-60 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#F5F5F3] flex items-center justify-center text-[26px] flex-shrink-0">
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-[#1A1A1A] mb-0.5">{card.name}</div>
              <div className="text-[11px] text-[#6B6B6B] mb-2">{card.desc}</div>
              {/* 진도 바 (현재 0%) */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[#F0F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-[#E24B4A] rounded-full" style={{ width: '0%' }} />
                </div>
                <span className="text-[10px] text-[#ADADAD] flex-shrink-0">
                  {card.chapterCount > 0 ? `${card.chapterCount}챕터` : '준비중'}
                </span>
              </div>
            </div>
            {card.subjectId && <ChevronRight size={16} className="text-[#ADADAD] flex-shrink-0" />}
          </button>
        ))}

        {/* 과목 추가 버튼 */}
        {cards.length < 5 && (
          <button
            onClick={() => router.push('/select-subject')}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-[#E5E5E5] text-[13px] text-[#ADADAD]"
          >
            <Plus size={16} /> 과목 추가하기
          </button>
        )}
      </div>
    </div>
  )
}
