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
  total_questions?: number | null
}

const FREE_LIMIT = 3
// IIPA Lv1 certification_id — "복습"/"신규" 라벨 판별용(course_certifications에
// Lv1 매핑이 있으면 기존 단원1~6="복습", 없으면 Lv2 전용 신규 단원7·8="신규")
const IIPA_LV1_CERT_ID = 'e52ea177-15cd-4a92-b624-391e69c160cb'

export default function ChaptersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const subjectId    = params.subjectId as string
  const searchParams   = useSearchParams()
  const courseIdFilter = searchParams.get('courseId')
  const certIdFilter   = searchParams.get('certId')
  const certQuery      = certIdFilter ? `?certId=${certIdFilter}` : ''

  const [subject, setSubject] = useState<Subject | null>(null)
  const [certLabel, setCertLabel] = useState('')
  const [chapters, setChapters] = useState<Chapter[]>([])
  // course_id → course title — 챕터 목록을 단원(course) 단위로 그룹핑해 섹션
  // 헤더로 보여주기 위함
  const [courseTitleMap, setCourseTitleMap] = useState<Record<string, string>>({})
  // 단원(course) 헤더 아코디언 펼침 상태 — 기본은 전체 접힘(빈 Set)
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<string>>(new Set())
  // course_certifications에 IIPA Lv1 매핑이 있는 course_id 집합 — "복습"/"신규" 라벨용
  const [lv1MappedCourseIds, setLv1MappedCourseIds] = useState<Set<string>>(new Set())
  const [statsMap, setStatsMap] = useState<Record<string, ChapterStat>>({})
  const [chapterStarMap, setChapterStarMap] = useState<Record<string, { fire: number; star: number }>>({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [accessCodeUsed, setAccessCodeUsed] = useState<string | null>(null)
  // ── 2026-06-24 추가 (P0-8): 만료 코드 접근 차단용 만료일 ──
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null)
  const [showCodePopup, setShowCodePopup]   = useState(false)
  const [codeInput, setCodeInput]           = useState('')
  const [codeError, setCodeError]           = useState<string | null>(null)
  const [codeSubmitting, setCodeSubmitting] = useState(false)


  // ── 2026-06-24 수정 (P0-8): 코드 존재 + (만료일 없으면 무기한 허용 OR 만료일 미래)일 때만 구독 인정 ──
  const isSubscribed = !!accessCodeUsed && (!codeExpiresAt || new Date(codeExpiresAt) > new Date())

  // ── 자격증 배지: certId(URL) 기준으로 조회 — course.certification_id가
  // 아니라 URL의 certId를 기준으로 삼아야 함. 이 페이지는 여러 course(단원)를
  // 한 subject로 합쳐서 보여주는데, course마다 certification_id(단일값)가
  // 다를 수 있어(예: IIPA 골격계=Lv1) 특정 course 값을 기준으로 하면 지금
  // 보고 있는 게 Lv1인지 Lv2인지와 다른 배지가 뜰 수 있음
  useEffect(() => {
    if (!certIdFilter) { setCertLabel(''); return }
    supabase.from('certifications').select('name').eq('id', certIdFilter).single()
      .then(({ data }) => { if (data?.name) setCertLabel(data.name) })
  }, [certIdFilter])

  // ── 챕터 목록 + 통계 fetch: 페이지 진입마다 항상 실행 ─────────────────
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    // access_code_used 확인
    fetch('/api/v1/profile-me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((pm) => {
        if (pm.accessCodeUsed) setAccessCodeUsed(pm.accessCodeUsed)
        if (pm.codeExpiresAt) setCodeExpiresAt(pm.codeExpiresAt)
      })
      .catch(() => {})
    fetchData()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = session?.user?.id ?? (session?.user as any)?.supabaseId ?? (session?.user as any)?.stableId
    console.log('[chapters] fetchStats userId:', userId)
    if (userId) fetchStats(userId)
  }, [status, subjectId, certIdFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // userId가 늦게 확보되는 경우 추가 보장
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = session?.user?.id ?? (session?.user as any)?.supabaseId ?? (session?.user as any)?.stableId
    if (!userId || status !== 'authenticated') return
    fetchStats(userId)
  }, [session?.user?.id, status, certIdFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // 포커스/탭 복귀 시 chapter_stats 재fetch
  useEffect(() => {
    const handleFocus = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uid = session?.user?.id ?? (session?.user as any)?.supabaseId ?? (session?.user as any)?.stableId
      if (status === 'authenticated' && uid) {
        fetchStats(uid)
      }
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleFocus()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [status, session?.user?.id, certIdFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = async (userId: string) => {
    try {
      let query = supabase
        .from('chapter_stats')
        .select('chapter_id, subject_id, avg_score, wrong_rate, total_attempts, last_attempt_at, lesson_completed, mini_quiz_correct, mini_quiz_total, lesson_completed_at, latest_score, best_score, test_attempts, total_questions')
        .eq('user_id', userId)

      // certId가 있는 자격증(같은 챕터를 여러 자격증이 공유하는 경우, 예: IIPA Lv1/Lv2)만
      // 그 자격증 문맥의 진도로 좁혀서 조회. certId가 없으면(레거시 자격증 — chapter_id 자체가
      // 자격증 간 공유되지 않으므로 certification_id로 좁힐 필요가 없음) 기존과 동일하게
      // user_id만으로 조회 — 백필로 certification_id가 채워진 기존 행도 그대로 잡혀야 하므로
      // 여기서 certification_id 필터를 걸면 안 됨(걸면 기존 진도가 전부 안 보이게 됨)
      if (certIdFilter) query = query.eq('certification_id', certIdFilter)

      const { data, error } = await query.order('updated_at', { ascending: false, nullsFirst: false })

      if (error) {
        console.log('[chapters] fetchStats error:', error)
        return
      }

      const map: Record<string, ChapterStat> = {}
      for (const s of (data ?? []) as ChapterStat[]) {
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

      // Step 2: 해당 subject의 courses (order_index — 여러 course를 합칠 때
      // 1차 정렬 기준으로 사용하기 위해 함께 조회. title — 챕터 목록 그룹핑
      // 섹션 헤더에 표시하기 위해 함께 조회)
      const { data: coursesData, error: coursesErr } = await supabase
        .from('courses')
        .select('id, title, order_index')
        .eq('subject_id', subjectId)

      if (coursesErr) {
        clearTimeout(timeoutId)
        setFetchError('강의 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
        setLoading(false)
        return
      }

      let courseIds = (coursesData ?? []).map((c) => c.id)
      const courseOrderMap: Record<string, number> = {}
      const courseTitleById: Record<string, string> = {}
      for (const c of (coursesData ?? [])) {
        courseOrderMap[c.id] = c.order_index ?? 0
        courseTitleById[c.id] = c.title
      }
      setCourseTitleMap(courseTitleById)

      // Step 2.5: certId가 있으면 course_certifications으로 한 번 더 좁힘
      // (같은 subject를 여러 자격증이 공유하는 경우 — 예: IIPA Lv1/Lv2 — course
      // 구성이 자격증마다 다를 수 있음). certId가 없으면 필터를 걸지 않고 기존과
      // 동일하게 subject의 모든 course를 그대로 사용(레거시 자격증 하위 호환)
      //
      // ⚠️ course_certifications는 IIPA처럼 실제로 매핑을 등록해둔 자격증에만
      // row가 있고, 그 외 자격증은 이 테이블에 row가 아예 없음(전체 미등록).
      // mappedCourses가 빈 배열인 것이 "이 자격증엔 course가 없다"는 뜻인지
      // "이 자격증은 애초에 course_certifications 매핑 대상이 아니다"라는 뜻인지
      // 구분할 수 없으므로, 매핑된 row가 하나라도 있을 때만 좁히고 0건이면
      // (미등록 자격증으로 간주해) 필터링을 건너뛰고 subject 전체를 그대로 사용
      if (certIdFilter && courseIds.length > 0) {
        const { data: mappedCourses, error: mapErr } = await supabase
          .from('course_certifications')
          .select('course_id')
          .eq('certification_id', certIdFilter)
          .in('course_id', courseIds)

        if (!mapErr && mappedCourses && mappedCourses.length > 0) {
          const allowedCourseIds = new Set(mappedCourses.map((m) => m.course_id))
          courseIds = courseIds.filter((id) => allowedCourseIds.has(id))
        }
        // mapErr(조회 실패) 또는 mappedCourses.length === 0(미등록 자격증)일 때는
        // 안전하게 필터링을 건너뛰고 기존 courseIds(subject 전체)를 그대로 사용
      }

      // "복습"/"신규" 라벨: course_certifications에 IIPA Lv1 매핑이 있는지 확인
      // (현재 보고 있는 자격증과 무관하게, 해당 course가 원래 단원1~6인지 신규
      // 단원7·8인지를 나타내는 값이라 certIdFilter 조건과 별개로 항상 조회)
      if (courseIds.length > 0) {
        const { data: lv1Mapped } = await supabase
          .from('course_certifications')
          .select('course_id')
          .eq('certification_id', IIPA_LV1_CERT_ID)
          .in('course_id', courseIds)
        setLv1MappedCourseIds(new Set((lv1Mapped ?? []).map((m) => m.course_id)))
      }

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

        // 1차: course.order_index, 2차: chapter.order_index — 여러 course의
        // 챕터가 합쳐질 때 chapter.order_index만으로 정렬하면(각 course마다
        // 1부터 다시 시작하는 값이라) 서로 다른 course의 챕터끼리 뒤섞이므로
        // course 순서를 우선 기준으로 둠
        allChapters = (chaptersData ?? []).sort((a, b) => {
          const courseOrderDiff = (courseOrderMap[a.course_id] ?? 0) - (courseOrderMap[b.course_id] ?? 0)
          if (courseOrderDiff !== 0) return courseOrderDiff
          return (a.order_index ?? 0) - (b.order_index ?? 0)
        })
      }

      // theory 슬라이드 보유 여부 확인
      const chapterIds = allChapters.map((c) => c.id)
      const { data: theoryCheck } = await supabase
        .from('chapter_cards')
        .select('chapter_id')
        .in('chapter_id', chapterIds)
        .or('content_type.eq.lesson,question_format.eq.short_answer')
        .limit(1000)

      const theorySet = new Set((theoryCheck ?? []).map((t) => t.chapter_id))
      // theory/oral 슬라이드가 있는 챕터만 표시 (없는 챕터는 숨김)
      const visibleByTheory = allChapters.filter((c) => theorySet.has(c.id))
      const finalChapters = visibleByTheory.length > 0 ? visibleByTheory : allChapters
      setChapters(finalChapters)

      // 챕터별 star_rating 집계
      if (finalChapters.length > 0) {
        const finalIds = finalChapters.map((c) => c.id)
        const { data: starData } = await supabase
          .from('chapter_cards')
          .select('chapter_id, star_rating')
          .in('chapter_id', finalIds)
          .in('star_rating', [4, 5])
        if (starData) {
          const starAcc: Record<string, { fire: number; star: number }> = {}
          for (const row of starData) {
            if (!starAcc[row.chapter_id]) starAcc[row.chapter_id] = { fire: 0, star: 0 }
            if (row.star_rating === 5) starAcc[row.chapter_id].fire += 1
            else if (row.star_rating === 4) starAcc[row.chapter_id].star += 1
          }
          setChapterStarMap(starAcc)
        }
      }

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

  // 단원(course)별 진도율 — 이미 certId 기준으로 필터링된 visibleChapters/statsMap을
  // 그대로 집계만 하는 것으로, 지난번 강의실 탭 진도율(subjectProgressByCert)과
  // 완료 기준(lesson_completed === true)을 동일하게 재사용함(새 계산 로직 아님)
  const courseProgressMap: Record<string, { total: number; completed: number }> = {}
  for (const ch of visibleChapters) {
    if (!courseProgressMap[ch.course_id]) courseProgressMap[ch.course_id] = { total: 0, completed: 0 }
    courseProgressMap[ch.course_id].total += 1
    if (statsMap[ch.id]?.lesson_completed === true) courseProgressMap[ch.course_id].completed += 1
  }

  const toggleCourse = (courseId: string) => {
    setExpandedCourseIds((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
        <button onClick={() => router.push('/trainer/dashboard?tab=classroom')} className="flex items-center gap-1 text-[13px] text-[#6B6B6B] mb-3">
          <ChevronLeft size={16} /> 강의실로
        </button>
        {certLabel && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A1A1A]/10 text-[#1A1A1A] inline-block mb-1">
            {certLabel}
          </span>
        )}
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
            const stat         = statsMap[ch.id]
            const isLocked     = !isSubscribed && idx >= FREE_LIMIT
            const isWeak       = stat && stat.wrong_rate >= 40

            /* ── Badge (좌측 아이콘) ── */
            let badgeBg   = 'bg-[#F5F5F3]'
            let badgeNode: React.ReactNode = (
              <span className="text-[#ADADAD] text-[13px] font-bold">{idx + 1}</span>
            )

            /* ── 점수 색상 ── */
            let scoreColor     = '#ADADAD'
            let scoreBorder    = 'border-[#ADADAD]'
            const testAttempts = stat?.test_attempts ?? 0
            const latestScore  = stat?.latest_score  ?? 0

            if (stat && testAttempts >= 1) {
              if (latestScore >= 80) {
                scoreColor  = '#639922'
                scoreBorder = 'border-[#639922]'
                badgeBg     = 'bg-[#63992215]'
                badgeNode   = <Check size={16} className="text-[#639922]" />
              } else if (latestScore >= 60) {
                scoreColor  = '#F5A623'
                scoreBorder = 'border-[#F5A623]'
                badgeBg     = 'bg-[#F5A62315]'
                badgeNode   = <span className="text-[#F5A623] text-[13px] font-bold">{idx + 1}</span>
              } else {
                scoreColor  = '#E24B4A'
                scoreBorder = 'border-[#E24B4A]'
                badgeBg     = 'bg-[#E24B4A]/10'
                badgeNode   = <span className="text-[#E24B4A] text-[13px] font-bold">{idx + 1}</span>
              }
            } else if (stat && testAttempts === 0) {
              badgeBg   = 'bg-[#378ADD]/10'
              badgeNode = <span className="text-[#378ADD] text-[13px] font-bold">{idx + 1}</span>
            }

            /* ── 오답수 계산 ── */
            const wrongCount = stat && testAttempts >= 1
              ? Math.round((stat.wrong_rate / 100) * (stat.total_questions ?? 10))
              : 0

            /* ── 단원(course) 섹션 헤더 — 이전 챕터와 course가 다르면 표시 ── */
            const showCourseHeader = idx === 0 || visibleChapters[idx - 1].course_id !== ch.course_id
            const courseTitle = courseTitleMap[ch.course_id] ?? ''
            const courseProgress = courseProgressMap[ch.course_id]
            const coursePct = courseProgress && courseProgress.total > 0
              ? Math.round((courseProgress.completed / courseProgress.total) * 100)
              : 0
            const isCourseExpanded = expandedCourseIds.has(ch.course_id)
            const courseLevelLabel = lv1MappedCourseIds.has(ch.course_id) ? '복습' : '신규'

            return (
              <div key={ch.id}>
                {showCourseHeader && courseTitle && (
                  <button
                    onClick={() => toggleCourse(ch.course_id)}
                    className={`w-full flex items-center gap-3 px-1 pb-2 text-left ${idx !== 0 ? 'pt-5' : ''}`}
                  >
                    <h2 className="text-[13px] font-black text-[#6B6B6B] flex-shrink-0">
                      {courseTitle}
                    </h2>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      courseLevelLabel === '신규' ? 'bg-[#00A651]/10 text-[#00A651]' : 'bg-[#F5F5F3] text-[#ADADAD]'
                    }`}>
                      {courseLevelLabel}
                    </span>
                    <div className="flex-1 h-1.5 bg-[#E5E5E5] rounded-full overflow-hidden" style={{ minWidth: 40 }}>
                      <div
                        className="h-full bg-[#00A651] rounded-full transition-all"
                        style={{ width: `${coursePct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#ADADAD] font-semibold flex-shrink-0">{coursePct}%</span>
                    <ChevronRight
                      size={16}
                      className={`text-[#ADADAD] flex-shrink-0 transition-transform ${isCourseExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>
                )}
                {isCourseExpanded && (
                  <>
                {idx === 4 && visibleChapters.length > 5 && (
                  <div className="flex flex-col items-center my-6 px-4">
                    <span className="text-[9px] text-[#ADADAD] mb-1 self-start">광고</span>
                    <KakaoAdFit unit="DAN-LTearBRyYBpdjEd9" width={320} height={100} />
                  </div>
                )}
              <div className={`w-full rounded-2xl border border-[#E5E5E5] bg-white flex items-center relative ${isLocked ? 'opacity-50' : ''}`}>

                {/* 메인 영역 (클릭 → 레슨 진입) */}
                <button
                  onClick={() => {
                    if (isLocked) { setShowCodePopup(true); return }
                    localStorage.setItem('kinepia_current_subject_id', subjectId)
                    router.push(`/lesson/${ch.id}${certQuery}`)
                  }}
                  className="flex-1 p-4 text-left flex items-center gap-4 min-w-0"
                >
                  {/* Badge */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isLocked ? 'bg-[#F5F5F3]' : badgeBg
                  }`}>
                    {isLocked ? <Lock size={15} className="text-[#ADADAD]" /> : badgeNode}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[14px] font-bold truncate ${isLocked ? 'text-[#ADADAD]' : 'text-[#1A1A1A]'}`}>
                        {ch.title}
                      </span>
                      {isWeak && !isLocked && <Flame size={13} className="text-[#E24B4A] flex-shrink-0" />}
                    </div>
                    {isLocked ? (
                      <span className="text-[10px] text-[#ADADAD]">🔒 구독 후 이용 가능</span>
                    ) : (() => {
                      const cs = chapterStarMap[ch.id]
                      if (!cs || (cs.fire === 0 && cs.star === 0)) return null
                      return (
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {cs.fire > 0 && (
                            <span className="bg-[#FAECE7] text-[#993C1D] text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                              🔥 {cs.fire}
                            </span>
                          )}
                          {cs.star > 0 && (
                            <span className="bg-[#FAEEDA] text-[#854F0B] text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                              ⭐ {cs.star}
                            </span>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </button>

                {/* 우측 버튼 영역 */}
                {!isLocked && (
                  <div className="flex items-center gap-0 pr-3 flex-shrink-0">
                    {stat && testAttempts >= 1 ? (
                      /* ── 테스트 완료: 리포트 버튼 + 구분선 + 재학습 버튼 ── */
                      <>
                        {/* 리포트 버튼 */}
                        <button
                          onClick={() => router.push(`/report/${ch.id}${certQuery}`)}
                          className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl border ${scoreBorder} min-w-[52px]`}
                          style={{ borderColor: scoreColor }}
                        >
                          <span className="text-[13px] font-bold leading-none" style={{ color: scoreColor }}>{latestScore}점</span>
                          {wrongCount > 0 ? (
                            <span className="text-[11px] font-semibold leading-none mt-0.5" style={{ color: scoreColor }}>오답 {wrongCount}</span>
                          ) : (
                            <span className="text-[11px] font-semibold leading-none mt-0.5 text-[#ADADAD]">오답 없음</span>
                          )}
                        </button>

                        {/* 구분선 */}
                        <div className="w-px h-8 bg-[#E5E5E5] mx-2" />

                        {/* 재학습 버튼 */}
                        <button
                          onClick={() => {
                            localStorage.setItem('kinepia_current_subject_id', subjectId)
                            router.push(`/lesson/${ch.id}${certQuery}`)
                          }}
                          className="flex flex-col items-center justify-center px-3 py-2 rounded-xl border"
                          style={{ borderColor: scoreColor }}
                        >
                          <span className="text-[13px] font-bold leading-none" style={{ color: scoreColor }}>재학습</span>
                          <span className="text-[11px] font-semibold leading-none mt-0.5 text-[#ADADAD]">다시풀기</span>
                        </button>
                      </>
                    ) : (
                      /* ── 미완료: 시작하기 버튼 ── */
                      <button
                        onClick={() => {
                          localStorage.setItem('kinepia_current_subject_id', subjectId)
                          router.push(`/lesson/${ch.id}${certQuery}`)
                        }}
                        className="flex flex-col items-center justify-center px-3 py-2 rounded-xl border border-[#639922]"
                      >
                        <span className="text-[13px] font-bold leading-none text-[#639922]">시작</span>
                        <span className="text-[11px] font-semibold leading-none mt-0.5 text-[#ADADAD]">하기</span>
                      </button>
                    )}
                  </div>
                )}

              </div>
                  </>
                )}
              </div>
            )
          })
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
