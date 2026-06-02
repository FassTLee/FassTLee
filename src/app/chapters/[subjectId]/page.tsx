'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, BookOpen, Flame, Check, Lock } from 'lucide-react'
import { KakaoAdFit } from '@/components/ads/KakaoAdFit'

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
  const subjectId    = params.subjectId as string
  const searchParams   = useSearchParams()
  const courseIdFilter = searchParams.get('courseId')

  const [subject, setSubject] = useState<Subject | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [statsMap, setStatsMap] = useState<Record<string, ChapterStat>>({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [accessCodeUsed, setAccessCodeUsed] = useState<string | null>(null)
  const [showCodePopup, setShowCodePopup]   = useState(false)
  const [codeInput, setCodeInput]           = useState('')
  const [codeError, setCodeError]           = useState<string | null>(null)
  const [codeSubmitting, setCodeSubmitting] = useState(false)

  const isSubscribed = !!accessCodeUsed

  // ── 챕터 목록 + 통계 fetch: 페이지 진입마다 항상 실행 ─────────────────
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    // access_code_used 확인
    fetch('/api/v1/profile-me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((pm) => { if (pm.accessCodeUsed) setAccessCodeUsed(pm.accessCodeUsed) })
      .catch(() => {})
    fetchData()
    const userId = session?.user?.id
    console.log('[chapters] fetchStats userId:', userId)
    if (userId) fetchStats(userId)
  }, [status, subjectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // userId가 늦게 확보되는 경우 추가 보장
  useEffect(() => {
    const userId = session?.user?.id
    if (!userId || status !== 'authenticated') return
    fetchStats(userId)
  }, [session?.user?.id, status]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = async (userId: string) => {
    try {
      const res  = await fetch(
        `/api/v1/report?userId=${encodeURIComponent(userId)}`,
        { cache: 'no-store' }          // 매번 최신 데이터 fetch
      )
      const data = await res.json()
      console.log('[chapters] chapter_stats count:', data.chapter_stats?.length, data.chapter_stats)
      const map: Record<string, ChapterStat> = {}
      for (const s of (data.chapter_stats ?? []) as ChapterStat[]) {
        map[s.chapter_id] = s
      }
      setStatsMap(map)
      console.log('[chapters] statsMap:', JSON.stringify(map))
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
        const chapQuery = courseIdFilter
          ? supabase.from('chapters').select('id, title, order_index, course_id')
              .eq('course_id', courseIdFilter)
          : supabase.from('chapters').select('id, title, order_index, course_id')
              .in('course_id', courseIds)

        const { data: chaptersData, error: chaptersErr } = await chapQuery
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

  const handleCodeSubmit = async () => {
    if (!codeInput.trim() || codeSubmitting) return
    setCodeSubmitting(true)
    setCodeError(null)
    try {
      const res  = await fetch('/api/v1/access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) { setCodeError(data.error ?? '오류가 발생했습니다'); return }
      setAccessCodeUsed(codeInput.trim().toUpperCase())
      setShowCodePopup(false)
      setCodeInput('')
    } catch {
      setCodeError('네트워크 오류가 발생했습니다')
    } finally {
      setCodeSubmitting(false)
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
          홈으로
        </button>
      </div>
    )
  }

  const visibleChapters = chapters.filter(
    (ch) => ch.course_id !== '376cc5f3-eeef-4117-89bf-229a3ce417ab'
  )

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
        <button onClick={() => router.push('/trainer/dashboard?tab=classroom')} className="flex items-center gap-1 text-[13px] text-[#6B6B6B] mb-3">
          <ChevronLeft size={16} /> 강의실로
        </button>
        <h1 className="text-[22px] font-black text-[#1A1A1A]">{subject?.name ?? '챕터 목록'}</h1>
        <p className="text-[13px] text-[#6B6B6B] mt-1">{visibleChapters.length}개 챕터</p>
      </div>

      <div className="p-4 space-y-2">
        {visibleChapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen size={40} className="text-[#ADADAD] mb-3" />
            <p className="text-[14px] font-bold text-[#1A1A1A] mb-1">학습 콘텐츠 준비중입니다</p>
            <p className="text-[12px] text-[#ADADAD]">곧 업데이트될 예정이에요</p>
          </div>
        ) : (
          visibleChapters.map((ch, idx) => {
            const stat     = statsMap[ch.id]
            console.log('[chapters] card:', ch.id, statsMap[ch.id])
            const isLocked = !isSubscribed && idx >= FREE_LIMIT
            const isWeak   = stat && stat.wrong_rate >= 40

            /* ── Status (3단계) ── */
            let statusLabel = ''
            let statusColor = 'text-[#ADADAD]'
            let badgeBg     = 'bg-[#F5F5F3]'
            let badgeNode: React.ReactNode = (
              <span className="text-[#ADADAD] text-[13px] font-bold">{idx + 1}</span>
            )

            if (stat) {
              const testAttempts = stat.test_attempts ?? 0
              const latestScore  = stat.latest_score  ?? 0

              if (testAttempts >= 1) {
                // Stage 3: 테스트 응시 완료
                statusLabel = `${latestScore}점`
                if (latestScore >= 80) {
                  statusColor = 'text-[#639922]'
                  badgeBg     = 'bg-[#63992215]'
                  badgeNode   = <Check size={16} className="text-[#639922]" />
                } else if (latestScore >= 60) {
                  statusColor = 'text-[#F5A623]'
                  badgeBg     = 'bg-[#F5A62315]'
                  badgeNode   = <span className="text-[#F5A623] text-[13px] font-bold">{idx + 1}</span>
                } else {
                  statusColor = 'text-[#E24B4A]'
                  badgeBg     = 'bg-[#E24B4A]/10'
                  badgeNode   = <span className="text-[#E24B4A] text-[13px] font-bold">{idx + 1}</span>
                }
              } else {
                // Stage 2: 챕터 입장, 테스트 미완료
                statusLabel = '학습 중'
                statusColor = 'text-[#378ADD]'
                badgeBg     = 'bg-[#378ADD]/10'
                badgeNode   = <span className="text-[#378ADD] text-[13px] font-bold">{idx + 1}</span>
              }
            }

            return (
              <div key={ch.id}>
                {idx === 4 && visibleChapters.length > 5 && (
                  <div className="flex flex-col items-center my-6 px-4">
                    <span className="text-[9px] text-[#ADADAD] mb-1 self-start">광고</span>
                    <KakaoAdFit unit="DAN-LTearBRyYBpdjEd9" width={320} height={100} />
                  </div>
                )}
              <div className="w-full rounded-2xl border border-[#E5E5E5] bg-white flex items-center active:bg-[#F5F5F3]">
                {/* 메인 영역 (클릭 → 레슨 진입) */}
                <button
                  onClick={() => {
                    if (isLocked) { setShowCodePopup(true); return }
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
                      <span className={`text-[14px] font-bold truncate ${isLocked || !stat ? 'text-[#ADADAD]' : 'text-[#1A1A1A]'}`}>
                        {ch.title}
                      </span>
                      {isWeak && !isLocked && <Flame size={13} className="text-[#E24B4A] flex-shrink-0" />}
                    </div>

                    {isLocked ? (
                      <span className="text-[10px] text-[#ADADAD]">🔒 구독 후 이용 가능</span>
                    ) : stat && (stat.test_attempts ?? 0) >= 1 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/report/${ch.id}`)
                        }}
                        className={`flex items-center gap-0.5 text-[11px] font-bold ${statusColor}`}
                      >
                        {statusLabel}
                        <ChevronRight size={10} />
                      </button>
                    ) : statusLabel ? (
                      <span className={`text-[10px] font-bold ${statusColor}`}>{statusLabel}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#00A651]">시작하기</span>
                    )}
                  </div>

                  {!isLocked && <ChevronRight size={16} className="text-[#ADADAD] flex-shrink-0" />}
                </button>

              </div>
              </div>
            )
          })
        )}
        {/* AdFit 배너 — 챕터 목록 최하단 */}
        {visibleChapters.length > 0 && (
          <div className="flex flex-col items-center pt-8 pb-4 px-4">
            <span className="text-[9px] text-[#ADADAD] mb-1 self-start">광고</span>
            <KakaoAdFit unit="DAN-LTearBRyYBpdjEd9" width={320} height={100} />
          </div>
        )}
      </div>

      {/* 이용권 코드 입력 팝업 */}
      {showCodePopup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6">
            <div className="text-center mb-5">
              <div className="text-[44px] mb-3">🎁</div>
              <h2 className="text-[18px] font-black text-[#1A1A1A] mb-2">Kinepia 무료 이용권</h2>
              <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
                코드를 입력하면 6월 30일까지<br />모든 과목을 무료로 이용할 수 있습니다.
              </p>
            </div>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(null) }}
              placeholder="코드를 입력하세요"
              className="w-full px-4 py-3 border-2 border-[#E5E5E5] rounded-2xl text-[15px] font-bold tracking-widest text-center mb-2 focus:outline-none focus:border-[#1A1A1A]"
              onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
            />
            {codeError && (
              <p className="text-[12px] text-[#E24B4A] text-center mb-2">{codeError}</p>
            )}
            <button
              onClick={handleCodeSubmit}
              disabled={!codeInput.trim() || codeSubmitting}
              className="w-full py-3.5 bg-[#1A1A1A] disabled:bg-[#E5E5E5] disabled:text-[#ADADAD] text-white rounded-2xl text-[15px] font-bold mt-1"
            >
              {codeSubmitting ? '확인 중...' : '코드 입력하기'}
            </button>
            <button
              onClick={() => { setShowCodePopup(false); setCodeInput(''); setCodeError(null) }}
              className="w-full py-2.5 mt-2 text-[13px] text-[#ADADAD] text-center"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
