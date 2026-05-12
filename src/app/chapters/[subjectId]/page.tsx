'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, BookOpen, Flame, Check, Lock, FileText } from 'lucide-react'

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
  lesson_completed?: boolean
  mini_quiz_correct?: number
  mini_quiz_total?: number
  latest_score?: number | null
  best_score?: number | null
  test_attempts?: number
}

const FREE_LIMIT = 3

export default function ChaptersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const subjectId = params.subjectId as string

  const [subject, setSubject] = useState<Subject | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [statsMap, setStatsMap] = useState<Record<string, ChapterStat>>({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showLockPopup, setShowLockPopup] = useState(false)

  // TODO: replace with real subscription check (e.g. from profile API)
  const isSubscribed = false

  // ── 챕터 목록 fetch (userId 불필요) ──────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    fetchData()
  }, [status, subjectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 통계 fetch (userId 확보되는 순간 실행) ────────────────────────────
  useEffect(() => {
    const userId = session?.user?.id  // Supabase UUID (auth.ts jwt 콜백에서 주입)
    console.log('[chapters] fetchStats userId:', userId)
    if (!userId) return
    fetchStats(userId)
  }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = async (userId: string) => {
    try {
      const res  = await fetch(`/api/v1/report?userId=${encodeURIComponent(userId)}`)
      const data = await res.json()
      console.log('[chapters] chapter_stats count:', data.chapter_stats?.length, data.chapter_stats)
      const map: Record<string, ChapterStat> = {}
      for (const s of (data.chapter_stats ?? []) as ChapterStat[]) {
        map[s.chapter_id] = s
      }
      setStatsMap(map)
    } catch (e) {
      console.log('[chapters] fetchStats error:', e)
    }
  }

  const fetchData = async () => {
    const timeoutId = setTimeout(() => {
      setFetchError('불러오는 시간이 너무 오래 걸려요. 잠시 후 다시 시도해주세요.')
      setLoading(false)
    }, 15000)

    try {
      // Step 1: subject 정보
      const { data: subjectData, error: subjectErr } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('id', subjectId)
        .single()

      if (subjectErr || !subjectData) {
        clearTimeout(timeoutId)
        setFetchError('과목 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
        setLoading(false)
        return
      }

      setSubject({ id: subjectData.id, name: subjectData.name })

      // Step 2: 해당 subject의 courses
      const { data: coursesData, error: coursesErr } = await supabase
        .from('courses')
        .select('id')
        .eq('subject_id', subjectId)

      if (coursesErr) {
        clearTimeout(timeoutId)
        setFetchError('강의 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
        setLoading(false)
        return
      }

      const courseIds = (coursesData ?? []).map((c) => c.id)

      // Step 3: chapters
      let allChapters: Chapter[] = []
      if (courseIds.length > 0) {
        const { data: chaptersData, error: chaptersErr } = await supabase
          .from('chapters')
          .select('id, title, order_index, course_id')
          .in('course_id', courseIds)
          .order('order_index', { ascending: true })

        if (chaptersErr) {
          clearTimeout(timeoutId)
          setFetchError('챕터 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
          setLoading(false)
          return
        }

        allChapters = (chaptersData ?? []).sort(
          (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
        )
      }

      setChapters(allChapters)
      clearTimeout(timeoutId)
      setLoading(false)
    } catch {
      clearTimeout(timeoutId)
      setFetchError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col items-center justify-center p-6 text-center">
        <div className="text-[40px] mb-3">⚠️</div>
        <p className="text-[15px] font-bold text-[#1A1A1A] mb-2">불러오기 실패</p>
        <p className="text-[13px] text-[#6B6B6B] mb-6 leading-relaxed">{fetchError}</p>
        <button
          onClick={() => { setFetchError(null); setLoading(true); fetchData() }}
          className="px-6 py-3 bg-[#00A651] text-white rounded-2xl text-[14px] font-bold"
        >
          다시 시도
        </button>
        <button
          onClick={() => router.push('/trainer/dashboard')}
          className="mt-3 px-6 py-3 text-[13px] text-[#6B6B6B]"
        >
          대시보드로 돌아가기
        </button>
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
            let badgeBg     = 'bg-[#00A651]/10'
            let badgeNode: React.ReactNode = (
              <span className="text-[#00A651] text-[13px] font-bold">{idx + 1}</span>
            )

            if (stat) {
              const testAttempts = stat.test_attempts ?? 0
              const latestScore  = stat.latest_score  ?? 0
              if (testAttempts >= 1 && latestScore >= 80) {
                statusLabel = `${latestScore}점`
                statusColor = 'text-[#639922]'
                badgeBg     = 'bg-[#63992215]'
                badgeNode   = <Check size={16} className="text-[#639922]" />
              } else if (testAttempts >= 1) {
                statusLabel = `${latestScore}점`
                statusColor = latestScore >= 60 ? 'text-[#378ADD]' : 'text-[#E24B4A]'
                badgeBg     = latestScore >= 60 ? 'bg-[#378ADD]/10' : 'bg-[#E24B4A]/10'
                badgeNode   = <span className={`text-[13px] font-bold ${latestScore >= 60 ? 'text-[#378ADD]' : 'text-[#E24B4A]'}`}>{idx + 1}</span>
              } else {
                statusLabel = '학습 중'
                statusColor = 'text-[#378ADD]'
                badgeBg     = 'bg-[#378ADD]/10'
                badgeNode   = <span className="text-[#378ADD] text-[13px] font-bold">{idx + 1}</span>
              }
            }

            return (
              <div key={ch.id} className="w-full bg-white rounded-2xl border border-[#E5E5E5] flex items-center active:bg-[#F5F5F3]">
                {/* 메인 영역 (클릭 → 레슨 진입) */}
                <button
                  onClick={() => {
                    if (isLocked) { setShowLockPopup(true); return }
                    localStorage.setItem('kinepia_current_subject_id', subjectId)
                    router.push(`/lesson/${ch.id}`)
                  }}
                  className="flex-1 p-4 text-left flex items-center gap-4 min-w-0"
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
                    ) : (
                      <span className={`text-[10px] font-bold ${statusColor}`}>{statusLabel}</span>
                    )}
                  </div>

                  {!isLocked && <ChevronRight size={16} className="text-[#ADADAD] flex-shrink-0" />}
                </button>

                {/* 리포트 아이콘 (stat 있을 때만) */}
                {!isLocked && stat && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/report/${ch.id}`)
                    }}
                    className="flex-shrink-0 px-3 py-4 border-l border-[#F5F5F3]"
                  >
                    <FileText size={16} className="text-[#ADADAD]" />
                  </button>
                )}
              </div>
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
            <button className="w-full py-3.5 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold">
              1주일 무료 체험
            </button>
            <button
              onClick={() => setShowLockPopup(false)}
              className="w-full border-2 border-[#111111] bg-white text-[#111111] rounded-2xl py-2.5 text-[13px] font-medium"
            >
              나중에
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
