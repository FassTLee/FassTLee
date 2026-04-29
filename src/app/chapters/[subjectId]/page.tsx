'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, BookOpen, Flame, Check } from 'lucide-react'

interface Chapter {
  id: string
  title: string
  order_index: number | null
  course_id: string
}

interface Subject {
  id: string
  name: string
}

interface ChapterStat {
  chapter_id: string
  avg_score: number
  wrong_rate: number
  total_attempts: number
  last_attempt_at: string | null
}

export default function ChaptersPage() {
  const { status } = useSession()
  const router = useRouter()
  const params = useParams()
  const subjectId = params.subjectId as string

  const [subject, setSubject] = useState<Subject | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [statsMap, setStatsMap] = useState<Record<string, ChapterStat>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    fetchData()
  }, [status, subjectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    const { data: subjectData } = await supabase
      .from('subjects').select('id, name').eq('id', subjectId).single()
    setSubject(subjectData ?? null)

    const { data: courses } = await supabase
      .from('courses').select('id').eq('subject_id', subjectId)

    if (!courses?.length) { setLoading(false); return }

    const courseIds = courses.map((c) => c.id)
    const { data: chapterData } = await supabase
      .from('chapters').select('id, title, order_index, course_id')
      .in('course_id', courseIds).order('order_index', { ascending: true })

    setChapters(chapterData ?? [])

    // 챕터 통계
    try {
      const res  = await fetch('/api/v1/report')
      const data = await res.json()
      const map: Record<string, ChapterStat> = {}
      for (const s of (data.chapter_stats ?? []) as ChapterStat[]) {
        map[s.chapter_id] = s
      }
      setStatsMap(map)
    } catch { /* ignore */ }

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
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
        <button onClick={() => router.push('/trainer/dashboard')} className="flex items-center gap-1 text-[13px] text-[#6B6B6B] mb-3">
          <ChevronLeft size={16} /> 대시보드
        </button>
        <h1 className="text-[22px] font-black text-[#1A1A1A]">{subject?.name ?? '챕터 목록'}</h1>
        <p className="text-[13px] text-[#6B6B6B] mt-1">{chapters.length}개 챕터</p>
      </div>

      <div className="p-4 space-y-2">
        {chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen size={40} className="text-[#ADADAD] mb-3" />
            <p className="text-[14px] font-bold text-[#1A1A1A] mb-1">학습 콘텐츠 준비중입니다</p>
            <p className="text-[12px] text-[#ADADAD]">곧 업데이트될 예정이에요</p>
          </div>
        ) : (
          chapters.map((ch, idx) => {
            const stat    = statsMap[ch.id]
            const done    = !!stat
            const isWeak  = stat && stat.wrong_rate >= 40

            return (
              <button
                key={ch.id}
                onClick={() => {
                  localStorage.setItem('kinepia_current_subject_id', subjectId)
                  router.push(`/lesson/${ch.id}`)
                }}
                className="w-full bg-white rounded-2xl border border-[#E5E5E5] p-4 text-left flex items-center gap-4 active:bg-[#F5F5F3]"
              >
                {/* 번호 / 완료 */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[14px] font-black flex-shrink-0 ${
                  done ? 'bg-[#63992215]' : 'bg-[#E24B4A]/10'
                }`}>
                  {done
                    ? <Check size={16} className="text-[#639922]" />
                    : <span className="text-[#E24B4A]">{idx + 1}</span>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[14px] font-bold text-[#1A1A1A] truncate">{ch.title}</span>
                    {isWeak && <Flame size={13} className="text-[#E24B4A] flex-shrink-0" />}
                  </div>
                  {stat ? (
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold ${
                        stat.avg_score >= 80 ? 'text-[#639922]' : stat.avg_score >= 60 ? 'text-[#378ADD]' : 'text-[#E24B4A]'
                      }`}>최고 {stat.avg_score}점</span>
                      <span className="text-[10px] text-[#ADADAD]">·</span>
                      <span className="text-[10px] text-[#ADADAD]">
                        {stat.last_attempt_at ? new Date(stat.last_attempt_at).toLocaleDateString('ko-KR') : ''}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-[#ADADAD]">⬜ 미완료</span>
                  )}
                </div>

                <ChevronRight size={16} className="text-[#ADADAD] flex-shrink-0" />
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
