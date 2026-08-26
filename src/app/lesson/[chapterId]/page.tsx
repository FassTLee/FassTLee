'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight as ArrowRight, Check, Zap, ZoomIn, X } from 'lucide-react'
import { track } from '@vercel/analytics'
import { KakaoAdFit } from '@/components/ads/KakaoAdFit'
import { PrivacyConsent } from '@/components/common/PrivacyConsent'
import { LoadingState } from '@/components/common/LoadingState'
import { useConsentGate } from '@/hooks/useConsentGate'
import { getLearningTypeMeta, isLearningType, type LearningType } from '@/lib/learning-types'
// Zap used in completion screen

function waitForRetry(delayMs: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }
    const timeoutId = setTimeout(finish, delayMs)
    const onAbort = () => {
      clearTimeout(timeoutId)
      finish()
    }
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) onAbort()
  })
}

const LEARNING_TYPE_KEY = 'kinepia_learning_type'
const CERT_KEY    = 'kinepia_selected_cert'
const SUBJECT_KEY = 'kinepia_current_subject_id'
const MODE_KEY    = 'lesson_slide_mode'

const CERT_LABELS: Record<string, string> = {
  'exercise-prescriptionist': '건강운동관리사',
  'sports-instructor-2':     '2급 생활스포츠지도사',
  'sports-instructor':       '생활스포츠지도사',
}

interface Question {
  id: string
  question: string
  options: string[]
  answer_index: number[] | null
  explanation: string | null
  difficulty?: string | null
  content_type?: string | null
  question_format?: string | null
  image_url?: string | null
  reference_text?: string | null
  key_points?: string[] | null
  linked_quiz_id?: string | null
}

interface Slide {
  id: string
  question: string
  explanation: string
  key_points: string[]
  image_url: string | null
  reference_text: string | null
  exam_years: number[] | null
  star_rating: number | null
  content_type: string | null
  question_format: string | null
  linked_quiz_id: string | null
}

interface MiniQ {
  id: string
  text: string
  explanation: string | null
  imageUrl: string | null
  options: [string, string]
  answerIdx: 0 | 1
}

// 카드 내부 3슬라이드 위치: 0=학습내용 1=체크포인트 2=미니퀴즈
type SubSlide = 0 | 1 | 2

function splitSentences(text: string): string[] {
  return text
    // 마침표/물음표/느낌표 뒤 공백을 문장 경계로 인식하되, 바로 뒤에 "("가 오면
    // (교재 p.25) 같은 문장 중간 페이지 인용이므로 거기서 끊지 않고 앞 문장에
    // 붙임. 원문자 목록(①②③...)이나 "•" 불릿 목록 앞도 항목 경계로 인식 —
    // 기존엔 마침표+공백만 인식해 목록 전체가 한 항목에 뭉쳐 나오는 문제가 있었음
    .split(/(?<=[.。!?])\s+(?!\()|\s*(?=[①-⑳•])/)
    .map((s) => s.replace(/[.。!?]$/, '').trim())
    .filter((s) => s.length > 1 && !/^\d+$/.test(s.trim()))
    .slice(0, 3)
}

function parseExplanation(text: string): { prose: string; points: string[] } {
  if (!text) return { prose: '', points: [] }

  // 번호 목록 패턴(1. 2. 또는 1) 2) 등)은 "줄 시작"에 올 때만 목록 구분자로
  // 인식(m 플래그 + ^). "(교재 p.25)" 같은 문장 중간 페이지 인용은 줄 시작이
  // 아니므로 매치되지 않아 prose가 거기서 잘리지 않음
  const parts = text.split(/^[ \t]*\d+[.)][ \t]+/m)
  const prose = parts[0].trim()
  const points = parts.slice(1)
    .map((p) => p.trim())
    .filter((p) => p.length > 2)

  return { prose, points }
}

function toSlideTitle(q: string): string {
  const t = q.trim()
  const m1 = t.match(/^(.+?)에\s*관한\s*설명으로\s*옳.+것은\??\s*$/)
  if (m1) return m1[1].trim() + '이란?'
  const m2 = t.match(/^(.+?)(?:으로|의\s*특징으로)\s*옳.+것은\??\s*$/)
  if (m2) return m2[1].trim() + '의 특징'
  const m3 = t.match(/^(.+?)[은는이가]\s*무엇인가\?\s*$/)
  if (m3) return m3[1].trim() + '이란?'
  return t.replace(/\?$/, '')
}

export default function LessonPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const chapterId = params.chapterId as string
  const searchParams = useSearchParams()
  const certId = searchParams.get('certId')
  const certQuery = certId ? `?certId=${certId}` : ''

  const [chapterTitle, setChapterTitle] = useState('')
  const [subjectName, setSubjectName]   = useState('')
  const [courseDesc, setCourseDesc]     = useState<string | null>(null)
  const [chapterVideoUrl, setChapterVideoUrl] = useState<string | null>(null)
  const [chapterAudioUrl, setChapterAudioUrl] = useState<string | null>(null)
  const [questions, setQuestions]       = useState<Question[]>([])
  const [slides, setSlides]             = useState<Slide[]>([])
  const [style, setStyle]               = useState<LearningType | null>(null)
  const [certLabel, setCertLabel]       = useState('')
  const [subjectId, setSubjectId]       = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)
  const [loadError, setLoadError]       = useState(false)
  const [lessonSessionId, setLessonSessionId] = useState<string | null>(null)
  const loadAbortRef = useRef<AbortController | null>(null)
  const loadInFlightRef = useRef(false)

  /* ── 가입 동의 게이트 (2차) — 수집(세션·슬라이드 로그) 시작 전 차단 ──── */
  const consent = useConsentGate()
  const consentBlocked = consent.loading || consent.needsConsent
  const [consentSubmitting, setConsentSubmitting] = useState(false)
  const handleConsentAccept = async ({ marketing }: { marketing: boolean }) => {
    setConsentSubmitting(true)
    try {
      const res = await fetch('/api/v1/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms: true, privacy: true, marketing, source: consent.source }),
      })
      if (res.ok) consent.markConsented()
    } catch {
      // 네트워크 오류 — 모달 유지, 재시도 가능
    } finally {
      setConsentSubmitting(false)
    }
  }

  /* ── Slide navigation ───────────────────────── */
  const [slideIndex, setSlideIndex]       = useState(0)
  const [subSlide, setSubSlide]           = useState<SubSlide>(0)
  const slideEnterTimeRef = useRef<number>(Date.now())
  const [slideMode, setSlideMode]         = useState<'manual' | 'auto'>('manual')
  const [checkedSentences, setCheckedSentences] = useState<boolean[]>([])
  const [autoProgress, setAutoProgress]   = useState(0)

  /* ── 슬라이드(카드)별 상호작용 집계 refs — 카드 전환 시 리셋 ── */
  const imageZoomCountRef = useRef(0)                              // 이미지 확대 탭 횟수
  const checkboxClicksRef = useRef<{ index: number; t: number }[]>([]) // 체크박스 클릭 {인덱스, 타임스탬프(ms)}
  // 로깅되는 체류 구간이 "속한" subSlide(방금 떠난 슬라이드). effect fire 시점 subSlide는
  // 이미 다음 슬라이드로 넘어가 있으므로, 직전 값을 별도 추적해야 row 라벨/값 격리가 정확함.
  const loggedSubSlideRef = useRef<SubSlide>(0)
  // ── 2026-07-19 수정: 미니퀴즈(sub_slide=2) slide_index +1 밀림 버그 — subSlide와 동일하게
  //    "로깅 구간이 속한 카드 인덱스"도 ref로 고정. effect 발화 시점 slideIndex state는 이미
  //    다음 카드로 넘어가 있어(카드 전환이 sub_slide 2 로깅을 발화) state를 직접 쓰면 +1 밀림. ──
  const loggedSlideIndexRef = useRef(0)   // 로깅 구간이 속한 카드 인덱스(방금 떠난 카드)

  /* ── 미니퀴즈(슬라이드3) per-attempt 로그 refs ── */
  // 배치3: 제출 즉시 INSERT로 attempt를 확정 저장(마지막 카드에서 안 넘어가도 유실 방지)하고,
  // 생성된 row id(logId)를 보관 → 전환/이탈 시 quiz_bridge_time·explanation_viewed만 UPDATE.
  const quizEnteredAtRef = useRef<number | null>(null)            // 슬라이드3 진입 시각(ms)
  const pendingQuizLogRef = useRef<{
    logId: string | null          // INSERT로 생성된 row id (응답 도착 후 채워짐)
    submittedAt: number           // 제출 시각(ms) — bridge_time 계산 기준
    explanationViewed: boolean    // 최종 확정값("해설 보기" 누르면 true)
  } | null>(null)

  /* ── 이탈(beforeunload/visibilitychange) 중복 전송 가드 ── */
  const exitSentRef  = useRef(false) // 같은 이탈에서 중복 exit/flush 방지 (재방문 시 해제)
  const completedRef = useRef(false) // 정상 완료 시 봉인 — 완료 후엔 이탈 exit 재전송 안 함

  /* ── enter 중복 전송 가드 ── */
  // StrictMode 이중 마운트/리렌더로 enter가 2번 나가면 API가 세션을 2개 만들어 고아 row가 생김.
  // "enter를 보낸 chapterId"를 기억해 같은 챕터로는 재요청하지 않는다.
  // (chapterId가 바뀌면 = 다른 챕터로 이동 → 새 enter 정상 허용)
  const enterSentRef = useRef<string | null>(null)

  /* ── Image zoom overlay (슬라이드1 학습이미지 · 슬라이드3 퀴즈이미지 공용) ── */
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)

  /* ── Mini quiz (슬라이드3) ──────────────────── */
  const [miniQ, setMiniQ]                 = useState<MiniQ | null>(null)
  const [miniSelected, setMiniSelected]   = useState<0 | 1 | null>(null)
  const [miniConfirmed, setMiniConfirmed] = useState(false)
  // 정답 시 해설은 "해설 보기"를 눌러야만 노출(선택적). 오답 시엔 항상 강제 노출.
  const [explanationRevealed, setExplanationRevealed] = useState(false)
  const [showComplete, setShowComplete]   = useState(false)

  // ── 이탈 시점 통합 flush: 세션 exit + 미니퀴즈 bridge_time UPDATE + 진행 중 슬라이드 로그 ──
  // 본문 함수로 정의해 매 렌더 최신 slideIndex/subSlide/slides/sentences를 캡처한다.
  // (아래 sendExitRef가 항상 최신 클로저를 가리키므로, 언마운트 cleanup도 stale 값을 잡지 않음)
  const sendExit = () => {
    const uid = session?.user?.id
    if (!lessonSessionId || !uid) return
    if (exitSentRef.current || completedRef.current) return // 중복/완료 후 재전송 방지
    exitSentRef.current = true

    // 1) 세션 exit — last_slide/last_sub_slide에 이탈 위치 기록
    navigator.sendBeacon(
      '/api/v1/chapter-session-log',
      JSON.stringify({
        userId:       uid,
        chapterId,
        action:       'exit',
        sessionId:    lessonSessionId,
        pageType:     'lesson',
        isCompleted:  showComplete,
        exitPoint:    subSlide === 2 ? 'mini_quiz' : 'slide',
        lastSlide:    slideIndex,
        lastSubSlide: subSlide,
      })
    )

    // 2) 미니퀴즈 pending → bridge_time·explanation_viewed UPDATE (attempt 본체는 제출 시 이미 저장됨)
    //    pending은 비우지 않는다 — 돌아와서 정상 전환/재이탈 시 최종값으로 다시 UPDATE 가능.
    const p = pendingQuizLogRef.current
    if (p && p.logId) {
      navigator.sendBeacon(
        '/api/v1/quiz-performance-log',
        JSON.stringify({
          mode: 'update',
          logId: p.logId,
          quizBridgeTime: Math.round((Date.now() - p.submittedAt) / 1000),
          explanationViewed: p.explanationViewed,
        })
      )
    }

    // 3) 진행 중 슬라이드의 lesson_slide 로그 flush (전환 없이 중간 이탈하는 경우 커버).
    //    전환 시엔 effect가 이미 전송하므로, 여기선 마지막 미전송 구간만.
    const prevSlide = slides[slideIndex]
    const duration = Math.round((Date.now() - slideEnterTimeRef.current) / 1000)
    if (prevSlide && duration > 0) {
      const sub = loggedSubSlideRef.current
      let imageZoomCount: number | null = null
      let checkboxOrderRaw: number[] | null = null
      let checkboxIntervalsRaw: number[] | null = null
      let checkboxClickInterval: number | null = null
      let checkboxTotal: number | null = null
      if (sub === 0) {
        imageZoomCount = imageZoomCountRef.current
      } else if (sub === 1) {
        const clicks = checkboxClicksRef.current
        checkboxOrderRaw = clicks.map((c) => c.index)
        const intervals = clicks
          .slice(1)
          .map((c, i) => Math.round(((c.t - clicks[i].t) / 1000) * 100) / 100)
        checkboxIntervalsRaw  = intervals
        checkboxClickInterval = intervals.length > 0
          ? Math.round((intervals.reduce((a, b) => a + b, 0) / intervals.length) * 100) / 100
          : 0
        checkboxTotal = sentences.length
      }
      navigator.sendBeacon(
        '/api/v1/lesson-log',
        JSON.stringify({
          userId: uid, chapterId, slideId: prevSlide.id,
          durationSeconds: duration, slideIndex, subSlide: sub,
          imageZoomCount, checkboxOrderRaw, checkboxIntervalsRaw, checkboxClickInterval, checkboxTotal,
        })
      )
    }
  }
  // sendExitRef가 항상 "최신 렌더의 sendExit"을 가리키게 → 이벤트/언마운트 모두 현재값으로 flush
  const sendExitRef = useRef(sendExit)
  sendExitRef.current = sendExit

  // ── 이탈 감지 3종 (마운트 1회 등록) ──
  //   beforeunload  : 탭 닫기/새로고침
  //   visibilitychange : 모바일 백그라운드/탭 전환 (돌아오면 가드 해제)
  //   언마운트 cleanup : 앱 내 클라이언트 라우팅 이탈(챕터목록 버튼/앱 내 뒤로가기) — 위 두 이벤트가 안 뜨는 경로
  //   → 정상완료(completedRef)/이미전송(exitSentRef)이면 sendExit 내부 가드로 skip
  useEffect(() => {
    const onBeforeUnload = () => sendExitRef.current()
    const onVisibility = () => {
      if (document.hidden) sendExitRef.current()
      else if (!completedRef.current) exitSentRef.current = false // 돌아오면 가드 해제
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibility)
      sendExitRef.current() // 언마운트 = 앱 내 라우팅 이탈 flush (가드 통과 시에만 전송)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Mini quiz session score ────────────────── */
  const miniCorrectRef = useRef(0)
  const miniTotalRef   = useRef(0)

  /* ── Related questions bottom sheet ─────────── */
  const [showRelatedQuestions, setShowRelatedQuestions] = useState(false)

  /* ── Swipe (touch + mouse) ──────────────────── */
  const [toastMsg, setToastMsg]     = useState<string | null>(null)
  const toastTimerRef               = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dragStartX  = useRef(0)
  const isDragging  = useRef(false)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    // 동의 전에는 콘텐츠 로드·수집을 시작하지 않는다 (동의 후 재실행)
    if (consentBlocked) return
    const s = localStorage.getItem(LEARNING_TYPE_KEY)
    setStyle(isLearningType(s) ? s : null)
    const cert = localStorage.getItem(CERT_KEY)
    if (cert && CERT_LABELS[cert]) setCertLabel(CERT_LABELS[cert])
    setSubjectId(localStorage.getItem(SUBJECT_KEY))
    const m = localStorage.getItem(MODE_KEY) as 'manual' | 'auto' | null
    if (m) setSlideMode(m)
    void loadLesson()
    return () => {
      loadAbortRef.current?.abort()
      loadAbortRef.current = null
      loadInFlightRef.current = false
    }
  }, [status, chapterId, consentBlocked]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── chapter-init: 첫 로드 시 chapter_stats row 생성 (없을 때만) ──────────
  useEffect(() => {
    const userId = session?.user?.id
    if (!userId || !chapterId) return
    if (consentBlocked) return   // 동의 전 chapter_stats row 생성 차단
    fetch('/api/v1/chapter-init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterId,
        subjectId: localStorage.getItem(SUBJECT_KEY) ?? null,
        certId,
      }),
    }).catch(() => {})
  }, [session?.user?.id, chapterId, certId, consentBlocked]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId || !chapterId) return
    if (consentBlocked) return   // 동의 전 세션 로그(enter) 전송 차단
    // 이 챕터로 이미 enter를 보냈으면 재요청 안 함 (StrictMode 이중 마운트 → 고아 세션 방지)
    if (enterSentRef.current === chapterId) return
    enterSentRef.current = chapterId
    fetch('/api/v1/chapter-session-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        chapterId,
        action: 'enter',
        pageType: 'lesson',
      }),
    })
      .then((r) => r.json())
      .then((data) => { if (data.sessionId) setLessonSessionId(data.sessionId) })
      .catch(() => { enterSentRef.current = null }) // 실패 시 가드 해제 — 재시도 가능하게
  }, [session?.user?.id, chapterId, consentBlocked]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async (signal: AbortSignal) => {
    const [{ data: ch, error: chapterError }, { data: qs, error: cardsError }] = await Promise.all([
      supabase.from('chapters').select('id, title, course_id, video_url, audio_url, image_url').eq('id', chapterId).abortSignal(signal).single(),
      supabase.from('chapter_cards')
        .select('id, chapter_id, question, options, answer_index, explanation, order_index, content_type, question_format, image_url, reference_text, key_points, exam_years, star_rating, linked_quiz_id')
        .eq('chapter_id', chapterId)
        .abortSignal(signal),
    ])
    if (chapterError) throw chapterError
    if (cardsError) throw cardsError

    if (ch) {
      setChapterTitle(ch.title)
      if (ch.video_url) setChapterVideoUrl(ch.video_url)
      if (ch.audio_url) setChapterAudioUrl(ch.audio_url)
      if (ch.course_id) {
        const { data: course } = await supabase
          .from('courses').select('id, subject_id, description, certification_id').eq('id', ch.course_id).abortSignal(signal).single()
        if (course?.description) setCourseDesc(course.description)
        if (course?.subject_id) {
          const { data: subj } = await supabase
            .from('subjects').select('name').eq('id', course.subject_id).abortSignal(signal).single()
          if (subj?.name) setSubjectName(subj.name)
        }
        if (course?.certification_id) {
          const { data: cert } = await supabase
            .from('certifications')
            .select('name')
            .eq('id', course.certification_id)
            .abortSignal(signal)
            .single()
          if (cert?.name) setCertLabel(cert.name)
        }
      }
    }

    const allQ = (qs ?? []).filter(q =>
      q.answer_index !== null &&
      Array.isArray(q.options) &&
      q.options.length >= 2
    )
    setQuestions(allQ)

    const oralQs = (qs ?? []).filter(q => q.content_type === 'lesson' || q.question_format === 'short_answer')
    const slideArray = oralQs.map(q => ({
      id: q.id,
      question: q.question,
      explanation: q.explanation ?? '',
      key_points: Array.isArray(q.key_points) ? q.key_points : [],
      image_url: q.image_url ?? null,
      reference_text: q.reference_text ?? null,
      exam_years: Array.isArray(q.exam_years) ? q.exam_years : null,
      star_rating: q.star_rating ?? null,
      content_type: q.content_type ?? null,
      question_format: q.question_format ?? null,
      linked_quiz_id: q.linked_quiz_id ?? null,
    }))
    setSlides(slideArray)

    track('lesson_started', { chapterId })
  }

  const loadLesson = async (manual = false) => {
    if (loadInFlightRef.current) return
    loadInFlightRef.current = true

    const controller = new AbortController()
    loadAbortRef.current = controller
    setLoading(true)
    setLoadError(false)

    const maxAttempts = manual ? 1 : 3
    try {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          await fetchData(controller.signal)
          if (controller.signal.aborted) return
          setLoading(false)
          return
        } catch (error) {
          if (controller.signal.aborted) return
          if (attempt === maxAttempts - 1) {
            console.warn('[lesson] required data load failed:', error)
            setLoadError(true)
            setLoading(false)
          } else {
            await waitForRetry(attempt === 0 ? 500 : 1500, controller.signal)
            if (controller.signal.aborted) return
          }
        }
      }
    } finally {
      if (loadAbortRef.current === controller) {
        loadAbortRef.current = null
        loadInFlightRef.current = false
      }
    }
  }

  /* ── 슬라이드 체류/상호작용 로깅 + Auto 타이머 ─────────── */
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (loading) return
    if (consentBlocked) return   // 동의 전 슬라이드 로그 전송 차단

    // ── 2026-07-15: 슬라이드 체류시간 + 상호작용 로깅 (수동/자동 모드 공통) ──
    // (기존엔 slideMode !== 'auto' 게이팅으로 수동모드 로그가 유실됨 — 게이트 위로 이동)
    const now = Date.now()
    const duration = Math.round((now - slideEnterTimeRef.current) / 1000)
    // ── 2026-07-19 수정: slide_index +1 밀림 — slideIndex state 대신 loggedSlideIndexRef 사용 ──
    // const prevSlide = slides[slideIndex]
    const prevSlide = slides[loggedSlideIndexRef.current]
    // 이 row가 나온 subSlide(방금 떠난 슬라이드) — slide_index는 카드 인덱스 유지, sub_slide로 슬라이드 구분
    const loggedSub = loggedSubSlideRef.current
    if (prevSlide && duration > 0 && session?.user?.id) {
      // ── 값 격리: 해당 subSlide에서 실제 일어난 행동만 채우고 나머지는 null 유지 ──
      let imageZoomCount:        number | null   = null
      let checkboxOrderRaw:      number[] | null = null
      let checkboxIntervalsRaw:  number[] | null = null
      let checkboxClickInterval: number | null   = null
      let checkboxTotal:         number | null   = null

      if (loggedSub === 0) {
        // 학습 슬라이드: 이미지 확대 횟수만
        imageZoomCount = imageZoomCountRef.current
      } else if (loggedSub === 1) {
        // 체크포인트 슬라이드: 체크박스 상호작용만
        const clicks = checkboxClicksRef.current
        checkboxOrderRaw = clicks.map((c) => c.index)                    // 클릭 순서대로의 인덱스
        const intervals = clicks
          .slice(1)
          .map((c, i) => Math.round(((c.t - clicks[i].t) / 1000) * 100) / 100) // 연속 클릭 간 간격(초)
        checkboxIntervalsRaw  = intervals
        checkboxClickInterval = intervals.length > 0
          ? Math.round((intervals.reduce((a, b) => a + b, 0) / intervals.length) * 100) / 100
          : 0
        checkboxTotal = sentences.length
      }
      // loggedSub === 2 (미니퀴즈): zoom·checkbox 모두 해당 없음 → 전부 null (미니퀴즈 로그는 배치2)

      fetch('/api/v1/lesson-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          chapterId,
          slideId: prevSlide.id,
          durationSeconds: duration,
          // ── 2026-07-19 수정: slide_index +1 밀림 — 로깅 구간이 속한 카드 인덱스(ref) 전송 ──
          // slideIndex,
          slideIndex: loggedSlideIndexRef.current,
          subSlide: loggedSub,
          imageZoomCount,
          checkboxOrderRaw,
          checkboxIntervalsRaw,
          checkboxClickInterval,
          checkboxTotal,
        }),
      }).catch(() => {})
    }
    slideEnterTimeRef.current = now
    // 다음 체류 구간이 속할 subSlide로 갱신 (현재 진입한 subSlide)
    loggedSubSlideRef.current = subSlide
    // ── 2026-07-19 수정: 다음 체류 구간이 속할 카드 인덱스도 함께 갱신 (subSlide와 대칭) ──
    loggedSlideIndexRef.current = slideIndex

    // ── auto 모드에서만 자동진행 타이머 (미니퀴즈 화면 제외) ──
    if (slideMode !== 'auto' || subSlide === 2) return
    setAutoProgress(0)
    timerRef.current = setInterval(() => {
      setAutoProgress((p) => Math.min(p + 2, 100)) // 100ms × 50 = 5 s
    }, 100)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [slideMode, slideIndex, subSlide, loading, consentBlocked]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 미니퀴즈 로그 마무리 (다음 카드로 넘어갈 때 bridge_time·explanation_viewed UPDATE) ── */
  // attempt 본체는 제출 시 이미 INSERT됨. 여기선 생성된 row(logId)에 이탈까지의 값만 갱신.
  const flushQuizLog = () => {
    const p = pendingQuizLogRef.current
    pendingQuizLogRef.current = null
    if (!p || !p.logId || !session?.user?.id) return
    fetch('/api/v1/quiz-performance-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'update',
        logId: p.logId,
        quizBridgeTime: Math.round((Date.now() - p.submittedAt) / 1000), // 제출~다음 카드(초)
        explanationViewed: p.explanationViewed,
      }),
    }).catch(() => {})
  }

  /* ── 카드 이동 헬퍼 ─────────────────────────────────── */
  const goToCard = (idx: number, sub: SubSlide = 0) => {
    flushQuizLog() // 이전 카드에 제출된 미니퀴즈 pending 로그가 있으면 전송
    setSlideIndex(idx)
    setSubSlide(sub)
    setCheckedSentences([])
    setAutoProgress(0)
    // 카드 전환 → per-card 상호작용 집계 리셋 (슬라이드별 집계)
    imageZoomCountRef.current = 0
    checkboxClicksRef.current = []
    setMiniQ(null)
    setMiniSelected(null)
    setMiniConfirmed(false)
    setExplanationRevealed(false)
  }

  const completeLesson = () => {
    flushQuizLog() // 마지막 카드 미니퀴즈 pending 로그 전송 (goToCard를 안 거치는 완료 경로)
    fetch('/api/v1/lesson-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterId,
        subjectId: localStorage.getItem(SUBJECT_KEY) ?? '',
        miniQuizCorrect: miniCorrectRef.current,
        miniQuizTotal:   miniTotalRef.current,
        userId: session?.user?.id ?? '',
        certId,
      }),
    }).catch(() => {})
    track('lesson_completed', { chapterId })
    // 정상 완료 = 권위 있는 exit. 이후 beforeunload/visibilitychange가 이를 덮어쓰지 않도록 봉인.
    completedRef.current = true
    exitSentRef.current  = true
    if (lessonSessionId && session?.user?.id) {
      fetch('/api/v1/chapter-session-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:       session.user.id,
          chapterId,
          action:       'exit',
          sessionId:    lessonSessionId,
          pageType:     'lesson',
          isCompleted:  true,
          exitPoint:    'lesson_complete',
          lastSlide:    slideIndex,
          lastSubSlide: subSlide,
        }),
      }).catch(() => {})
    }
    setShowComplete(true)
  }

  const goToNextCard = () => {
    if (slideIndex >= slides.length - 1) {
      completeLesson()
    } else {
      goToCard(slideIndex + 1, 0)
    }
  }

  // linked_quiz_id로 지목된 카드로 슬라이드3 데이터를 구성. 실패 시 false 반환
  // (건너뛰기는 호출부에서 처리) — 챕터 풀 순환/생성형 폴백 없음
  // TODO: 문제은행 확장(개념당 quiz 2~3개) 후, 재도전 시 미출제 문항 우선 출제로 전환
  const buildMiniQuizFor = (idx: number): boolean => {
    const linkedQuizId = slides[idx]?.linked_quiz_id
    if (!linkedQuizId) return false

    const q = questions.find((qq) => qq.id === linkedQuizId)
    if (!q || q.answer_index === undefined || q.answer_index === null) return false

    const correct = q.options[q.answer_index?.[0] ?? 0]
    const wrongOptions = q.options.filter((_, i) => !q.answer_index?.includes(i))
    if (!correct || wrongOptions.length === 0) return false

    const wrongOpt = wrongOptions[Math.floor(Math.random() * wrongOptions.length)]
    const aIsCorrect = Math.random() > 0.5
    setMiniQ({
      id: q.id,
      text: q.question,
      explanation: q.explanation,
      imageUrl: q.image_url ?? null,
      options: aIsCorrect ? [correct, wrongOpt] : [wrongOpt, correct],
      answerIdx: aIsCorrect ? 0 : 1,
    })
    setMiniSelected(null)
    setMiniConfirmed(false)
    setExplanationRevealed(false)
    return true
  }

  /* ── 슬라이드 전진(스와이프 좌 / 다음 버튼 / 화살표) ─── */
  const advance = () => {
    if (subSlide === 0) {
      setSubSlide(1)
      return
    }
    if (subSlide === 1) {
      if (slideMode === 'manual' && !allChecked) { showToast('모든 항목을 체크해주세요'); return }
      const hasQuiz = buildMiniQuizFor(slideIndex)
      if (hasQuiz) {
        quizEnteredAtRef.current = Date.now() // 슬라이드3 진입 시각 — response_time 기준점
        setSubSlide(2)
      } else {
        // linked_quiz_id 없음(현재 IIPA는 없음, 타 자격증 확장 시 발생 가능)
        // — 슬라이드3 건너뛰고 슬라이드2에서 바로 완료 처리
        goToNextCard()
      }
      return
    }
    // subSlide === 2
    if (!miniConfirmed) { showToast('문제를 풀어주세요'); return }
    const slide = slides[slideIndex]
    if (miniSelected === miniQ?.answerIdx && slide?.exam_years && slide.exam_years.length > 0) {
      setShowRelatedQuestions(true)
      return
    }
    goToNextCard()
  }

  /* ── 슬라이드 후진(스와이프 우 / 이전 버튼) ───────────── */
  const goBack = () => {
    if (subSlide > 0) {
      setSubSlide((s) => (s === 2 ? 1 : 0))
      return
    }
    if (slideIndex > 0) {
      goToCard(slideIndex - 1, 0)
    }
  }

  // 오답 후 "다시 학습하기" — 체크포인트(1)가 아니라 학습내용(0)부터 다시 보게 함
  const retryFromWrong = () => {
    setSubSlide(0)
    setCheckedSentences([])
    setMiniQ(null)
    setMiniSelected(null)
    setMiniConfirmed(false)
    setExplanationRevealed(false)
  }

  const continueAfterWrong = () => {
    const slide = slides[slideIndex]
    if (slide?.exam_years && slide.exam_years.length > 0) {
      setShowRelatedQuestions(true)
    } else {
      goToNextCard()
    }
  }

  const handleMiniConfirm = () => {
    if (miniSelected === null) { showToast('문제를 풀어주세요'); return }
    if (miniConfirmed || !miniQ) return
    setMiniConfirmed(true)
    const correct = miniSelected === miniQ.answerIdx
    miniTotalRef.current   += 1
    if (correct) miniCorrectRef.current += 1

    // ── per-attempt 로그용 정보 보관(제출 시점) — 다음 카드 이탈 시 quiz_performance_logs로 flush ──
    // ── 배치3: 제출 즉시 quiz_performance_logs INSERT (attempt 확정 — 이탈해도 유실 방지) ──
    const submittedAt = Date.now()
    const responseTime = quizEnteredAtRef.current != null
      ? Math.round((submittedAt - quizEnteredAtRef.current) / 1000) // 진입~제출(초)
      : null
    const explanationViewed0 = correct ? false : true // 오답=해설 자동노출→true, 정답=아직 "해설 보기" 안 누름
    pendingQuizLogRef.current = { logId: null, submittedAt, explanationViewed: explanationViewed0 }

    if (session?.user?.id) {
      fetch('/api/v1/quiz-performance-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode:         'insert',
          chapterId,
          questionId:   miniQ.id,
          questionType: 'mini_quiz',
          isCorrect:    correct,
          answerGiven:  miniSelected,   // 고른 선지 인덱스(0=A / 1=B)
          responseTime,
          explanationViewed: explanationViewed0,
          quizEnteredAt: quizEnteredAtRef.current != null
            ? new Date(quizEnteredAtRef.current).toISOString() : null,
          // quizBridgeTime은 제출 시점엔 없음 → 전환/이탈 시 UPDATE로 채움
        }),
      })
        .then((r) => r.json())
        .then((d) => { if (d?.id && pendingQuizLogRef.current) pendingQuizLogRef.current.logId = d.id })
        .catch(() => {})
    }

    fetch('/api/v1/mini-quiz-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterId,
        subjectId:  localStorage.getItem(SUBJECT_KEY) ?? '',
        questionId: miniQ.id,
        correct,
        userId: session?.user?.id ?? '',
        certId,
      }),
    }).catch(() => {})
  }

  const showToast = (msg: string) => {
    setToastMsg(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 2000)
  }

  const toggleMode = () => {
    const next = slideMode === 'manual' ? 'auto' : 'manual'
    setSlideMode(next)
    localStorage.setItem(MODE_KEY, next)
    setAutoProgress(0)
    setCheckedSentences([])
  }

  const onDragStart = (clientX: number) => {
    dragStartX.current = clientX
    isDragging.current = true
  }
  const onDragEnd = (clientX: number) => {
    if (!isDragging.current) return
    isDragging.current = false
    if (showComplete || showRelatedQuestions) return
    const delta = clientX - dragStartX.current
    if (Math.abs(delta) < 50) return
    if (delta < 0) {
      advance()
    } else {
      goBack()
    }
  }

  /* touch */
  const onTouchStart = (e: React.TouchEvent) => onDragStart(e.touches[0].clientX)
  const onTouchEnd   = (e: React.TouchEvent) => onDragEnd(e.changedTouches[0].clientX)

  /* mouse (PC) */
  const onMouseDown  = (e: React.MouseEvent) => onDragStart(e.clientX)
  const onMouseUp    = (e: React.MouseEvent) => onDragEnd(e.clientX)
  const onMouseLeave = () => { isDragging.current = false; dragStartX.current = 0 }

  // 동의 게이트 — 미동의 시 콘텐츠·수집을 렌더/시작하지 않고 모달만 노출(닫기 불가)
  if (consent.needsConsent) {
    return (
      <div className="min-h-screen bg-[#F5F5F3]">
        <PrivacyConsent
          onAccept={handleConsentAccept}
          onLogout={() => signOut({ callbackUrl: '/landing' })}
          submitting={consentSubmitting}
        />
      </div>
    )
  }

  if (loading) {
    return <LoadingState status="loading" />
  }

  if (loadError) {
    return <LoadingState status="error" onRetry={() => { void loadLesson(true) }} />
  }

  const styleMeta    = getLearningTypeMeta(style)
  const isConcise    = styleMeta?.lessonMode === 'concise'
  const currentSlide = slides[slideIndex]

  const parsed = currentSlide?.explanation
    ? parseExplanation(currentSlide.explanation)
    : { prose: '', points: [] }

  const rawPoints = Array.isArray(currentSlide?.key_points)
    ? (currentSlide.key_points as string[]).filter((p: string) => p.length > 1)
    : []
  const sentences = rawPoints.length > 0
    ? rawPoints
    : splitSentences(currentSlide?.explanation ?? '')

  const allChecked = slides.length > 0 && sentences.length === 0
    ? false
    : sentences.length > 0
      && checkedSentences.length === sentences.length
      && checkedSentences.every((v) => v === true)

  /* ════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => subjectId ? router.push(`/chapters/${subjectId}${certQuery}`) : router.back()}
            className="flex items-center gap-1 text-[13px] text-[#6B6B6B]"
          >
            <ChevronLeft size={16} /> 챕터 목록
          </button>

          {/* Manual / Auto toggle */}
          <button
            onClick={toggleMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors ${
              slideMode === 'auto'
                ? 'bg-[#00A651] text-white'
                : 'bg-[#F5F5F3] text-[#6B6B6B] border border-[#E5E5E5]'
            }`}
          >
            {slideMode === 'manual' ? '🖐️ 수동' : '▶️ 자동'}
          </button>
        </div>

        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {certLabel && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A1A1A]/10 text-[#1A1A1A]">
              {certLabel}
            </span>
          )}
          {styleMeta && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={isConcise
                ? { backgroundColor: '#378ADD20', color: '#378ADD' }
                : { backgroundColor: '#63992220', color: '#639922' }}
            >
              {styleMeta.label}
            </span>
          )}
        </div>

        {/* Breadcrumb */}
        {subjectName && (
          <p className="text-[11px] text-[#ADADAD] mb-0.5">{subjectName} › {chapterTitle}</p>
        )}
        <h1 className="text-[18px] font-black text-[#1A1A1A]">{chapterTitle}</h1>
      </div>

      {/* Slide counter + sub-slide dots */}
      {slides.length > 0 && (
        <div className="flex flex-col items-center justify-center pt-3 gap-1.5">
          <span className="text-[12px] text-[#ADADAD]">
            {slides.length}개 중 {slideIndex + 1}번째
          </span>
          <div className="flex items-center gap-1.5">
            {([0, 1, 2] as const).map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  subSlide === i ? 'w-5 bg-[#00A651]' : 'w-1.5 bg-[#E5E5E5]'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Slide area */}
      <div
        className="flex-1 overflow-hidden p-4 flex flex-col relative"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        style={{ touchAction: 'pan-y', userSelect: 'none' }}
      >
        {/* Arrow buttons */}
        {slides.length > 1 && (
          <>
            <button
              onClick={goBack}
              disabled={slideIndex === 0 && subSlide === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center shadow-sm disabled:opacity-20 transition-opacity"
            >
              <ChevronLeft size={16} className="text-[#6B6B6B]" />
            </button>
            <button
              onClick={advance}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center shadow-sm disabled:opacity-20 transition-opacity"
            >
              <ArrowRight size={16} className="text-[#6B6B6B]" />
            </button>
          </>
        )}
        {slides.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-[48px] mb-3">📚</div>
            <p className="text-[15px] font-bold text-[#1A1A1A] mb-2">{chapterTitle}</p>
            {courseDesc && (
              <p className="text-[13px] text-[#6B6B6B] leading-relaxed px-4">{courseDesc}</p>
            )}
          </div>
        ) : (
          <>
            {/* Main slide card */}
            <div className="flex-1 bg-white rounded-2xl border border-[#E5E5E5] p-5 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                <div className="w-7 h-7 rounded-lg bg-[#00A651]/10 flex items-center justify-center text-[12px] font-black text-[#00A651] flex-shrink-0">
                  {slideIndex + 1}
                </div>
                <span className="text-[11px] text-[#ADADAD] font-medium">
                  {subSlide === 0 ? '학습 내용' : subSlide === 1 ? '핵심 포인트 체크' : '확인 퀴즈'}
                </span>
              </div>

              <p className="text-[15px] font-bold text-[#1A1A1A] mb-4 leading-snug flex-shrink-0">
                {currentSlide ? toSlideTitle(currentSlide.question) : ''}
              </p>

              {/* ── 슬라이드1: 학습 내용 (이미지 확대 가능) ── */}
              {subSlide === 0 && (
                <div className="flex-1 overflow-y-auto">
                  {/* 영상 (챕터 단위) */}
                  {chapterVideoUrl && (
                    <div className="mb-3 rounded-xl overflow-hidden bg-[#1A1A1A]">
                      <video
                        src={chapterVideoUrl}
                        controls
                        playsInline
                        className="w-full"
                        style={{ maxHeight: '220px', objectFit: 'contain' }}
                      />
                    </div>
                  )}

                  {/* 이미지 (카드 단위 — 탭하면 확대) */}
                  {currentSlide?.image_url && (
                    <button
                      type="button"
                      onClick={() => {
                        imageZoomCountRef.current += 1 // 로컬 카운터만 증가 (네트워크 호출 없음)
                        setZoomImageUrl(currentSlide.image_url)
                      }}
                      className="mb-3 relative w-full rounded-xl overflow-hidden block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentSlide.image_url}
                        alt="학습 이미지"
                        className="w-full object-contain rounded-xl"
                        style={{ maxHeight: '220px' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                      <span className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-[10px] font-medium">
                        <ZoomIn size={12} /> 확대
                      </span>
                    </button>
                  )}

                  {/* 음성 (챕터 단위) */}
                  {chapterAudioUrl && (
                    <div className="mb-3">
                      <audio controls src={chapterAudioUrl} className="w-full" />
                    </div>
                  )}

                  {parsed.prose && (
                    <div className="p-3 bg-[#F5F5F3] rounded-xl">
                      <p className="text-[11px] font-bold text-[#00A651] mb-2">📖 학습 내용</p>
                      <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{parsed.prose}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── 슬라이드2: 체크포인트 (전부 체크해야 다음 가능) ── */}
              {subSlide === 1 && (
                <div className="flex-1 overflow-y-auto">
                  {sentences.length > 0 ? (
                    <div className="space-y-2">
                      {sentences.map((sentence, i) => {
                        const isChecked = checkedSentences[i] ?? false
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (slideMode !== 'manual') return
                              // 클릭마다 {인덱스, 타임스탬프} 축적 (슬라이드 전환 시 payload로 전송)
                              checkboxClicksRef.current.push({ index: i, t: Date.now() })
                              setCheckedSentences((prev) => {
                                const next = new Array(sentences.length).fill(false)
                                prev.forEach((v, idx) => { next[idx] = v })
                                next[i] = !next[i]
                                return next
                              })
                            }}
                            className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                              isChecked ? 'border-[#639922] bg-[#63992210]' : 'border-[#E5E5E5] bg-[#F5F5F3]'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                              isChecked ? 'bg-[#639922] border-[#639922]' : 'border-[#ADADAD]'
                            }`}>
                              {isChecked && <Check size={11} className="text-white" />}
                            </div>
                            <span className={`text-[13px] leading-relaxed ${isChecked ? 'text-[#639922]' : 'text-[#1A1A1A]'}`}>
                              {sentence}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-16 text-[#ADADAD] text-[13px]">
                      내용을 준비 중입니다
                    </div>
                  )}
                </div>
              )}

              {/* ── 슬라이드3: 미니퀴즈 ── */}
              {subSlide === 2 && miniQ && (
                <div className="flex-1 overflow-y-auto">
                  <p className="text-[14px] font-semibold text-[#1A1A1A] mb-3 leading-snug">
                    {miniQ.text}
                  </p>

                  {/* 문제 그림 (있을 때만 — 탭하면 확대). 그림 보고 맞히는 유형은
                      자세히 봐야 하므로 슬라이드1과 동일한 확대 오버레이 재사용 */}
                  {miniQ.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setZoomImageUrl(miniQ.imageUrl)}
                      className="mb-4 relative w-full rounded-xl overflow-hidden block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={miniQ.imageUrl}
                        alt="문제 그림"
                        className="w-full object-contain rounded-xl"
                        style={{ maxHeight: '240px' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                      <span className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-[10px] font-medium">
                        <ZoomIn size={12} /> 확대
                      </span>
                    </button>
                  )}

                  {/* 보기 A / B */}
                  <div className="space-y-3 mb-5">
                    {([0, 1] as const).map((idx) => {
                      const label     = idx === 0 ? 'A' : 'B'
                      const isCorrect = miniConfirmed && idx === miniQ.answerIdx
                      const isWrong   = miniConfirmed && miniSelected === idx && idx !== miniQ.answerIdx
                      const optionText = miniQ.options[idx].replace(/^[①②③④⑤]\s*/, '').trim()
                      return (
                        <button
                          key={idx}
                          onClick={() => !miniConfirmed && setMiniSelected(idx)}
                          className={`w-full flex items-start gap-3 px-4 py-4 rounded-2xl border-2 text-left transition-all ${
                            miniConfirmed
                              ? isCorrect
                                ? 'border-[#639922] bg-[#63992210]'
                                : isWrong
                                  ? 'border-[#E24B4A] bg-[#E24B4A10]'
                                  : 'border-[#E5E5E5] bg-[#F5F5F3] opacity-50'
                              : miniSelected === idx
                                ? 'border-[#00A651] bg-[#00A651]/5'
                                : 'border-[#E5E5E5]'
                          }`}
                        >
                          <span className={`text-[13px] font-black flex-shrink-0 w-5 ${
                            miniConfirmed
                              ? isCorrect ? 'text-[#639922]'
                                : isWrong ? 'text-[#E24B4A]'
                                : 'text-[#ADADAD]'
                              : miniSelected === idx ? 'text-[#00A651]' : 'text-[#ADADAD]'
                          }`}>
                            {label}.
                          </span>
                          <span className={`flex-1 text-[14px] font-medium leading-relaxed ${
                            miniConfirmed
                              ? isCorrect ? 'text-[#639922]'
                                : isWrong ? 'text-[#E24B4A]'
                                : 'text-[#ADADAD]'
                              : 'text-[#1A1A1A]'
                          }`}>
                            {optionText}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {miniConfirmed && (() => {
                    const isCorrectAnswer = miniSelected === miniQ.answerIdx
                    // 정답: 해설은 "해설 보기"를 눌러야만 노출(선택적)
                    // 오답: 해설 자동/필수 노출(항상 표시)
                    const showExplanation = miniQ.explanation && (!isCorrectAnswer || explanationRevealed)
                    return (
                      <div className={`p-4 rounded-2xl ${
                        isCorrectAnswer ? 'bg-[#63992210] border border-[#63992230]' : 'bg-[#E24B4A10] border border-[#E24B4A20]'
                      }`}>
                        <p className={`text-[14px] font-bold ${showExplanation ? 'mb-1.5' : ''} ${
                          isCorrectAnswer ? 'text-[#639922]' : 'text-[#E24B4A]'
                        }`}>
                          {isCorrectAnswer ? '정확해요! ✅' : '아쉬워요!'}
                        </p>
                        {showExplanation && (
                          <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{miniQ.explanation}</p>
                        )}
                        {/* 정답이고 아직 해설을 열지 않았을 때만 "해설 보기" 버튼 노출 */}
                        {isCorrectAnswer && miniQ.explanation && !explanationRevealed && (
                          <button
                            onClick={() => {
                              setExplanationRevealed(true)
                              // 정답 케이스에서 실제로 "해설 보기"를 누른 경우만 true로 기록
                              if (pendingQuizLogRef.current) pendingQuizLogRef.current.explanationViewed = true
                            }}
                            className="mt-1 text-[12px] font-semibold text-[#639922] underline"
                          >
                            해설 보기
                          </button>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* Progress bars — 이전 카드로만 이동 (건너뛰기 방지) */}
            <div className="flex items-center gap-1.5 px-1 py-3 flex-shrink-0">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (i > slideIndex) { showToast('아직 도달하지 않은 카드예요'); return }
                    goToCard(i, 0)
                  }}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                    i <= slideIndex ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Auto timer bar */}
      {slideMode === 'auto' && subSlide !== 2 && slides.length > 0 && (
        <div className="h-1 bg-[#E5E5E5] flex-shrink-0">
          <div
            className="h-full bg-[#00A651] transition-none"
            style={{ width: `${autoProgress}%` }}
          />
        </div>
      )}

      {/* Bottom button */}
      <div className="flex-shrink-0 p-4 bg-white border-t border-[#E5E5E5]">
        {slides.length === 0 ? (
          <button
            onClick={() => router.push(`/test/${chapterId}${certQuery}`)}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#00A651] text-white rounded-2xl text-[16px] font-bold"
          >
            <Zap size={18} /> 챕터 테스트
          </button>
        ) : subSlide === 2 ? (
          !miniQ ? null : !miniConfirmed ? (
            <button
              onClick={handleMiniConfirm}
              className="w-full py-4 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold"
            >
              확인
            </button>
          ) : miniSelected === miniQ.answerIdx ? (
            <button
              onClick={advance}
              className="w-full py-4 bg-[#00A651] text-white rounded-2xl text-[16px] font-bold"
            >
              {slideIndex >= slides.length - 1 ? '학습 완료 🎉' : '다음 카드 →'}
            </button>
          ) : (
            <div className="space-y-2">
              <button
                onClick={retryFromWrong}
                className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[14px] font-bold"
              >
                다시 학습하기
              </button>
              <button
                onClick={continueAfterWrong}
                className="w-full py-3.5 border-2 border-[#E5E5E5] text-[#6B6B6B] rounded-2xl text-[14px] font-semibold"
              >
                그래도 계속하기
              </button>
            </div>
          )
        ) : subSlide === 1 ? (
          slideMode === 'manual' ? (
            <button
              onClick={advance}
              disabled={!allChecked}
              className={`w-full py-4 rounded-2xl text-[16px] font-bold transition-all ${
                allChecked ? 'bg-[#00A651] text-white' : 'bg-[#E5E5E5] text-[#ADADAD]'
              }`}
            >
              확인 퀴즈
            </button>
          ) : (
            <div className="w-full py-4 text-center text-[14px] text-[#6B6B6B] font-medium">
              ▶️ 자동 학습 중... ({slideIndex + 1}/{slides.length})
            </div>
          )
        ) : (
          <button
            onClick={advance}
            className="w-full py-4 bg-[#00A651] text-white rounded-2xl text-[16px] font-bold"
          >
            다음
          </button>
        )}
      </div>

      {/* ══════════ Completion Screen ══════════ */}
      {showComplete && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F5F5F3] px-6">
          <div className="text-[72px] mb-6">🎉</div>
          <h2 className="text-[26px] font-black text-[#1A1A1A] mb-2">학습 완료!</h2>
          <p className="text-[15px] text-[#6B6B6B] mb-1">{chapterTitle}</p>
          <p className="text-[13px] text-[#ADADAD] mb-6">총 {slides.length}개 슬라이드를 완료했어요</p>
          <div className="w-full max-w-sm mb-4 flex justify-center">
            <KakaoAdFit unit="DAN-LTearBRyYBpdjEd9" width={320} height={100} />
          </div>
          <button
            onClick={() => router.push(`/test/${chapterId}${certQuery}`)}
            className="w-full max-w-sm flex items-center justify-center gap-2 py-4 bg-[#00A651] text-white rounded-2xl text-[16px] font-bold"
          >
            <Zap size={18} /> 챕터 테스트
          </button>
          <button
            onClick={() => {
              setShowComplete(false)
              goToCard(0, 0)
              miniCorrectRef.current = 0
              miniTotalRef.current   = 0
            }}
            className="mt-3 text-[13px] text-[#ADADAD] underline"
          >
            다시 복습하기
          </button>
        </div>
      )}

      {/* ══════════ Toast ══════════ */}
      {toastMsg && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-[#1A1A1A]/90 text-white text-[14px] font-medium rounded-2xl shadow-lg whitespace-nowrap">
          {toastMsg}
        </div>
      )}

      {/* ══════════ Image Zoom Overlay (슬라이드1·3 공용) ══════════ */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomImageUrl(null)}
        >
          <button
            onClick={() => setZoomImageUrl(null)}
            className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
          >
            <X size={18} className="text-white" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomImageUrl}
            alt="확대 이미지"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ══════════ Related Questions Bottom Sheet ══════════ */}
      {showRelatedQuestions && (() => {
        const pendingSlide = slides[slideIndex]
        return (
          <div className="fixed inset-0 z-[60] flex flex-col justify-end">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => { setShowRelatedQuestions(false); goToNextCard() }}
            />

            <div className="relative bg-white rounded-t-2xl px-5 pt-5 pb-10 max-h-[80vh] overflow-y-auto">
              {/* Handle */}
              <div className="w-9 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

              {/* 제목 */}
              <p className="text-[14px] font-bold text-[#1A1A1A] mb-1">이 내용에서 출제된 문제</p>
              {pendingSlide?.question && (
                <p className="text-[12px] text-[#ADADAD] mb-4 leading-snug">{pendingSlide.question}</p>
              )}

              {/* 문제 카드 목록 */}
              <div className="space-y-3 mb-6">
                {/* 현재 슬라이드 자체가 oral 문제 카드 역할 */}
                {pendingSlide && (
                  <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
                    {/* 뱃지 */}
                    {pendingSlide.star_rating === 5 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2"
                        style={{ backgroundColor: '#FAECE7', color: '#993C1D' }}>
                        🔥 필수 학습
                      </span>
                    )}
                    {pendingSlide.star_rating === 4 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2"
                        style={{ backgroundColor: '#FAEEDA', color: '#854F0B' }}>
                        ⭐ 단골 출제
                      </span>
                    )}
                    {/* 출제 연도 */}
                    {pendingSlide.exam_years && pendingSlide.exam_years.length > 0 && (
                      <p className="text-[11px] text-[#5F5E5A] mb-1.5">
                        출제 연도: {pendingSlide.exam_years.join(', ')}년
                      </p>
                    )}
                    {/* 문제 텍스트 */}
                    <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{pendingSlide.question}</p>
                  </div>
                )}
              </div>

              {/* 하단 버튼 */}
              <button
                onClick={() => {
                  setShowRelatedQuestions(false)
                  goToNextCard()
                }}
                className="w-full py-4 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold"
              >
                {slideIndex >= slides.length - 1 ? '학습 완료 🎉' : '다음 카드로 →'}
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
