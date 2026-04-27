'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronRight, BookOpen } from 'lucide-react'

interface Subject {
  id: string
  name: string
  description: string | null
  chapter_count?: number
}

const SUBJECT_ICONS: Record<string, string> = {
  '기초 해부학': '🦴',
  '기능 해부학': '💪',
  '교차증후군': '🔄',
  '컨디셔닝 마사지': '🤲',
  '스트레칭': '🧘',
  '재활': '🏃',
  '영양학': '🥗',
  '운동처방': '📋',
}

export default function SelectSubjectPage() {
  const { status } = useSession()
  const router = useRouter()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.replace('/landing')
      return
    }
    fetchSubjects()
  }, [status, router])

  const fetchSubjects = async () => {
    const { data: subjectData } = await supabase.from('subjects').select('id, name, description')
    if (!subjectData) { setLoading(false); return }

    const withCounts = await Promise.all(
      subjectData.map(async (s) => {
        const { count } = await supabase
          .from('chapters')
          .select('id', { count: 'exact', head: true })
          .eq('subject_id', s.id)
        return { ...s, chapter_count: count ?? 0 }
      })
    )
    setSubjects(withCounts)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      {/* 헤더 */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
        <h1 className="text-[22px] font-black text-[#1A1A1A]">과목 선택</h1>
        <p className="text-[13px] text-[#6B6B6B] mt-1">학습할 과목을 선택하세요</p>
      </div>

      <div className="p-4">
        {subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen size={40} className="text-[#ADADAD] mb-3" />
            <p className="text-[14px] text-[#ADADAD]">등록된 과목이 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {subjects.map((s) => {
              const icon = SUBJECT_ICONS[s.name] ?? '📚'
              return (
                <button
                  key={s.id}
                  onClick={() => router.push(`/chapters/${s.id}`)}
                  className="bg-white rounded-2xl border border-[#E5E5E5] p-4 text-left active:bg-[#F5F5F3] transition-all"
                >
                  <div className="text-[32px] mb-2">{icon}</div>
                  <div className="text-[14px] font-bold text-[#1A1A1A] leading-tight mb-1">{s.name}</div>
                  {s.description && (
                    <div className="text-[11px] text-[#6B6B6B] line-clamp-2 mb-2">{s.description}</div>
                  )}
                  <div className="flex items-center gap-1 text-[11px] text-[#ADADAD]">
                    <span>{s.chapter_count}개 챕터</span>
                    <ChevronRight size={12} />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
