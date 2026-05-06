'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, BookOpen, Flame, Check, Lock } from 'lucide-react'

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

const FREE_LIMIT = 3

export default function ChaptersPage() {
  const { status } = useSession()
  const router = useRouter()
  const params = useParams()
  const subjectId = params.subjectId as string

  const [subject, setSubject] = useState<Subject | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [statsMap, setStatsMap] = useState<Record<string, ChapterStat>>({})
  const [loading, setLoading] = useState(true)
  const [showLockPopup, setShowLockPopup] = useState(false)

  // TODO: replace with real subscription check (e.g. from profile API)
  const isSubscribed = false

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    fetchData()
  }, [status, subjectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    // subjects → courses → chapters 를 nested select로 한 번에 조회
    const { data: subjectData, error: subjectErr } = await supabase
      .from('subjects')
      .select('id, name, courses(id, chapters(id, title, order_index, course_id))')
      .eq('id', subjectId)
      .single()

    if (subjectErr || !subjectData) {
      setLoading(false)
      return
    }

    setSubject({ id: subjectData.id, name: subjectData.name })

    type CourseRow = { id: string; chapters: Chapter[] | null }
    const allChapters: Chapter[] = ((subjectData as { id: string; name: string; courses: CourseRow[] | null }).courses ?? [])
      .flatMap((c) => c.chapters ?? [])
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

    setChapters(allChapters)

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
            const stat     = statsMap[ch.id]
            const isLocked = !isSubscribed && idx >= FREE_LIMIT
            const isWeak   = stat && stat.wrong_rate >= 40

            /* ── Status ── */
            let statusLabel = '수강 전'
            let statusColor = 'text-[#ADADAD]'
            let badgeBg     = 'bg-[#E24B4A]/10'
            let badgeNode: React.ReactNode = (
              <span className="text-[#E24B4A] text-[13px] font-bold">{idx + 1}</span>
            )

            if (stat) {
              if (stat.avg_score >= 80) {
                statusLabel = '완료 ✅'
                statusColor = 'text-[#639922]'
                badgeBg     = 'bg-[#63992215]'
                badgeNode   = <Check size={16} className="text-[#639922]" />
              } else {
                statusLabel = '학습중'
                statusColor = 'text-[#378ADD]'
                badgeBg     = 'bg-[#378ADD]/10'
                badgeNode   = <span className="text-[#378ADD] text-[13px] font-bold">{idx + 1}</span>
              }
            }

            return (
              <button
                key={ch.id}
                onClick={() => {
                  if (isLocked) { setShowLockPopup(true); return }
                  localStorage.setItem('kinepia_current_subject_id', subjectId)
                  router.push(`/lesson/${ch.id}`)
                }}
                className="w-full bg-white rounded-2xl border border-[#E5E5E5] p-4 text-left flex items-center gap-4 active:bg-[#F5F5F3]"
              >
                {/* Badge */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isLocked ? 'bg-[#F5F5F3]' : badgeBg
                }`}>
                  {isLocked
                    ? <Lock size={15} className="text-[#ADADAD]" />
                    : badgeNode
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[14px] font-bold truncate ${isLocked ? 'text-[#ADADAD]' : 'text-[#1A1A1A]'}`}>
                      {ch.title}
                    </span>
                    {isWeak && !isLocked && <Flame size={13} className="text-[#E24B4A] flex-shrink-0" />}
                  </div>

                  {isLocked ? (
                    <span className="text-[10px] text-[#ADADAD]">🔒 구독 후 이용 가능</span>
                  ) : stat ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold ${statusColor}`}>{statusLabel}</span>
                      <span className="text-[10px] text-[#ADADAD]">·</span>
                      <span className={`text-[10px] font-bold ${
                        stat.avg_score >= 80 ? 'text-[#639922]' : stat.avg_score >= 60 ? 'text-[#378ADD]' : 'text-[#E24B4A]'
                      }`}>최고 {stat.avg_score}점</span>
                      {stat.last_attempt_at && (
                        <>
                          <span className="text-[10px] text-[#ADADAD]">·</span>
                          <span className="text-[10px] text-[#ADADAD]">
                            {new Date(stat.last_attempt_at).toLocaleDateString('ko-KR')}
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className={`text-[10px] ${statusColor}`}>{statusLabel}</span>
                  )}
                </div>

                {!isLocked && <ChevronRight size={16} className="text-[#ADADAD] flex-shrink-0" />}
              </button>
            )
          })
        )}
      </div>

      {/* Free-plan lock popup */}
      {showLockPopup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4">
            <div className="text-center">
              <div className="text-[44px] mb-2">🔒</div>
              <h2 className="text-[18px] font-black text-[#1A1A1A] mb-2">구독 전용 챕터</h2>
              <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
                이 챕터는 구독 후 이용 가능합니다.<br />
                1주일 무료 체험으로 모든 챕터를 열어보세요!
              </p>
            </div>
            <button className="w-full py-3.5 bg-[#E24B4A] text-white rounded-2xl text-[15px] font-bold">
              1주일 무료 체험
            </button>
            <button
              onClick={() => setShowLockPopup(false)}
              className="w-full py-2.5 text-[13px] text-[#ADADAD] font-medium"
            >
              나중에
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
