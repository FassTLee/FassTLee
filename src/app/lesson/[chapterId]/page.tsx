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
import { LESSON_INTERACTION_KEYS as IK } from '@/lib/lesson-interaction-keys'
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
  order_index?: number | null
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
  order_index: number | null
}

interface MiniQ {
  id: string
  text: string
  explanation: string | null
  imageUrl: string | null
  options: [string, string]
  originalIndices: [number, number]
  answerIdx: 0 | 1
}

function buildMiniQuizAssignmentMap(slides: Slide[], questions: Question[]): Map<string, string> {
  const assignments = new Map<string, string>()
  const usedQuestionIds = new Set<string>()
  const questionsById = new Map(questions.map((question) => [question.id, question]))

  // 저작 데이터인 linked_quiz_id는 중복 링크도 그대로 보존한다.
  for (const slide of slides) {
    if (!slide.linked_quiz_id) continue
    const linkedQuestion = questionsById.get(slide.linked_quiz_id)
    if (!linkedQuestion || linkedQuestion.answer_index === null) continue
    assignments.set(slide.id, linkedQuestion.id)
    usedQuestionIds.add(linkedQuestion.id)
  }

  const slideIds = new Set(slides.map((slide) => slide.id))
  const fallbackCandidates = [
    ...questions.filter((question) => !slideIds.has(question.id) && question.content_type === 'quiz'),
    ...questions.filter((question) => !slideIds.has(question.id) && question.content_type !== 'quiz'),
  ]
  let candidateIndex = 0

  for (const slide of slides) {
    if (assignments.has(slide.id)) continue
    while (
      candidateIndex < fallbackCandidates.length &&
      usedQuestionIds.has(fallbackCandidates[candidateIndex].id)
    ) {
      candidateIndex += 1
    }
    const candidate = fallbackCandidates[candidateIndex]
    if (!candidate) continue
    assignments.set(slide.id, candidate.id)
    usedQuestionIds.add(candidate.id)
    candidateIndex += 1
  }

  return assignments
}

// 카드 내부 3슬라이드 위치: 0=학습내용 1=체크포인트 2=미니퀴즈
type SubSlide = 0 | 1 | 2

// ★ 이 구현은 임시다. 서비스 재개 전에 반드시 제거·교체한다.
// 확정 설계는 "약 3챕터·100카드 행동 데이터 확보 후 배정"인데
// 이 버전은 URL 파라미터로 즉시 적용한다. 이대로 재개하면
// (1) 순환논증 가드 위반 — 처방받은 행동이 분류 신호를 오염시킨다
// (2) profiles에 대조군 배정 컬럼이 없어 사후 배정이 불가능하다
const SHOOT_SUB_SLIDE_ORDERS: Record<LearningType, readonly SubSlide[]> = {
  explorer: [0, 1, 2],
  repeater: [1, 0, 2],
  spotter: [2, 0, 1],
  planner: [0, 2, 1],
}

type AdvanceTrigger = 'swipe' | 'arrow' | 'button' | 'progressbar' | 'back' | 'retry' | 'auto'
type QueuedBehaviorLog = {
  id: string
  userId: string
  url: string
  payload: Record<string, unknown>
}
const BEHAVIOR_LOG_QUEUE_KEY = 'kinepia_behavior_log_queue'
const BEHAVIOR_LOG_URLS = ['/api/v1/lesson-log', '/api/v1/chapter-session-log', '/api/v1/quiz-performance-log']
let memoryLogQueue: QueuedBehaviorLog[] = []
const drainingUsers = new Set<string>()
const inFlightLogs = new Set<string>()

function readLogQueue(): QueuedBehaviorLog[] {
  try {
    const value = JSON.parse(sessionStorage.getItem(BEHAVIOR_LOG_QUEUE_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((entry) =>
      entry && typeof entry.id === 'string' && typeof entry.userId === 'string' &&
      BEHAVIOR_LOG_URLS.includes(entry.url) && entry.payload && typeof entry.payload === 'object'
    ).slice(-20) : []
  } catch (error) {
    console.warn('[lesson-log] retry queue read failed:', error)
    return memoryLogQueue
  }
}

function writeLogQueue(queue: QueuedBehaviorLog[]) {
  memoryLogQueue = queue.slice(-20)
  try {
    sessionStorage.setItem(BEHAVIOR_LOG_QUEUE_KEY, JSON.stringify(memoryLogQueue))
  } catch (error) {
    console.warn('[lesson-log] retry queue storage failed; memory only:', error)
  }
}

async function postBehaviorLog(entry: QueuedBehaviorLog): Promise<boolean> {
  try {
    const res = await fetch(entry.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry.payload),
      keepalive: true,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const result = await res.json()
    if (result.skipped) throw new Error('Log skipped by server')
    return true
  } catch (error) {
    console.warn('[lesson-log] delivery failed:', entry.url, error)
    return false
  }
}

async function drainLogQueue(userId: string) {
  if (drainingUsers.has(userId)) return
  drainingUsers.add(userId)
  try {
    // 다른 계정으로 로그인한 뒤 이전 사용자의 큐를 재전송하지 않는다.
    for (let i = 0; i < 20; i++) {
      const entry = readLogQueue().find((item) => item.userId === userId && !inFlightLogs.has(item.id))
      if (!entry) break
      inFlightLogs.add(entry.id)
      const ok = await postBehaviorLog(entry)
      inFlightLogs.delete(entry.id)
      if (!ok) break
      writeLogQueue(readLogQueue().filter((item) => item.id !== entry.id))
    }
  } finally {
    drainingUsers.delete(userId)
  }
}

function deliverBehaviorLog(url: string, payload: Record<string, unknown>, userId: string, exiting = false) {
  const entry: QueuedBehaviorLog = { id: crypto.randomUUID(), userId, url, payload }
  if (exiting) {
    try {
      if (navigator.sendBeacon(url, new Blob([JSON.stringify(payload)], { type: 'application/json' }))) return
    } catch (error) {
      console.warn('[lesson-log] beacon failed:', error)
    }
  }
  // 응답 전에 탭이 닫혀도 회수할 수 있게 먼저 보관하고, 성공한 항목만 제거한다.
  inFlightLogs.add(entry.id)
  writeLogQueue([...readLogQueue(), entry])
  void postBehaviorLog(entry).then((ok) => {
    inFlightLogs.delete(entry.id)
    if (ok) {
      writeLogQueue(readLogQueue().filter((item) => item.id !== entry.id))
      void drainLogQueue(userId)
    }
  })
}

type SlideLogSegment = {
  chapterId: string
  slideId: string
  index: number
  sub: SubSlide
  total: number
  visits: number
  sent: boolean
  scrollDepth: number | null
  raw: Record<string, unknown>
  lastTapAt: number | null
  checkedOnce: Set<number>
  checkboxTotal: number
}

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
  const styleParam = searchParams.get('style')
  const isShootMode = styleParam !== null && isLearningType(styleParam)
  const shootStyle: LearningType = isLearningType(styleParam) ? styleParam : 'explorer'

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
  const miniQuizAssignmentsRef = useRef<Map<string, string>>(new Map())
  const [orderEntry, setOrderEntry] = useState<{ slides: Slide[]; style: LearningType } | null>(null)
  const orderEntryRef = useRef<typeof orderEntry>(null)
  const orderReady = !isShootMode || (orderEntry?.slides === slides && orderEntry.style === shootStyle)

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
  const slideLogRef = useRef<SlideLogSegment | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const cardVisitsRef = useRef(new Map<string, number>())
  const subSlideEntriesRef = useRef(new Map<string, number>())
  const backgroundStartRef = useRef<number | null>(null)
  const pointerMethodRef = useRef<string | null>(null)
  const quizExitSentRef = useRef(false)

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

  // 체류 구간의 식별자·메타데이터를 state 변경 전에 고정한다.
  const beginSlideLog = (idx: number, sub: SubSlide, reentry = false, resume = false) => {
    const slide = slides[idx]
    if (!slide || loading || consentBlocked) return
    const previous = slideLogRef.current
    const cardKey = chapterId + ':' + slide.id
    let visits = cardVisitsRef.current.get(cardKey) ?? 0
    if (!visits || reentry || previous?.slideId !== slide.id || previous.chapterId !== chapterId) visits++
    cardVisitsRef.current.set(cardKey, visits)
    const subKey = cardKey + ':' + sub
    const entries = (subSlideEntriesRef.current.get(subKey) ?? 0) + (resume ? 0 : 1)
    subSlideEntriesRef.current.set(subKey, entries)
    // 최초 콘텐츠 진입만 기준 시각을 초기화한다. 미전송 구간의 시각은 유지한다.
    if (!previous) slideEnterTimeRef.current = Date.now()
    const points = slide.key_points.filter((point) => point.length > 1)
    slideLogRef.current = {
      chapterId, slideId: slide.id, index: idx, sub, total: slides.length, visits, sent: false,
      scrollDepth: null, lastTapAt: null, checkedOnce: new Set(),
      checkboxTotal: (points.length ? points : splitSentences(slide.explanation)).length,
      raw: {
        [IK.tapCount]: 0,
        [IK.tapIntervalsMs]: [],
        [IK.tabSwitchCount]: 0,
        [IK.backgroundMs]: 0,
        [IK.viewportW]: window.innerWidth,
        [IK.viewportH]: window.innerHeight,
        [IK.orientation]: window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape',
        [IK.subSlideEntryCount]: entries,
        ...(sub === 0 ? { [IK.imageZoomTargets]: [] } : {}),
        ...(sub === 1 ? { [IK.checkboxRecheckCount]: 0 } : {}),
      },
    }
    loggedSlideIndexRef.current = idx
    loggedSubSlideRef.current = sub
    imageZoomCountRef.current = 0
    checkboxClicksRef.current = []
    quizExitSentRef.current = false
  }

  const observeScroll = (element: HTMLDivElement) => {
    const segment = slideLogRef.current
    if (!segment || segment.sent || element.clientHeight <= 0) return
    const ratio = element.scrollHeight <= element.clientHeight ? 1
      : Math.max(0, Math.min(1, (element.scrollTop + element.clientHeight) / element.scrollHeight))
    segment.scrollDepth = Math.max(segment.scrollDepth ?? 0, ratio)
    segment.raw[IK.reachedBottom] = segment.scrollDepth >= 1
  }

  const observeInteraction = (method: string) => {
    const segment = slideLogRef.current
    if (!segment || segment.sent) return
    if (!(IK.firstInteractionDelayMs in segment.raw)) {
      segment.raw[IK.firstInteractionDelayMs] = Math.max(0, Date.now() - slideEnterTimeRef.current)
    }
    segment.raw[IK.inputMethod] = method
  }

  const observeTap = (event: React.MouseEvent) => {
    observeInteraction(event.detail === 0 ? 'keyboard' : pointerMethodRef.current ?? 'mouse')
    const segment = slideLogRef.current
    if (!segment || segment.sent || event.detail === 0) return
    const now = Date.now()
    segment.raw[IK.tapCount] = Number(segment.raw[IK.tapCount]) + 1
    if (segment.lastTapAt != null) (segment.raw[IK.tapIntervalsMs] as number[]).push(now - segment.lastTapAt)
    segment.lastTapAt = now
  }

  const observeImageZoom = (targetId: string) => {
    const segment = slideLogRef.current
    if (!segment || segment.sent) return
    const targets = (segment.raw[IK.imageZoomTargets] as string[] | undefined) ?? []
    targets.push(targetId)
    segment.raw[IK.imageZoomTargets] = targets
  }

  const flushSlideLog = (trigger: AdvanceTrigger | null = null, exiting = false, isCompleted = false) => {
    const segment = slideLogRef.current
    const uid = session?.user?.id
    if (!segment || segment.sent || !uid || consentBlocked) return false
    const now = Date.now()
    const clicks = checkboxClicksRef.current
    const intervals = clicks.slice(1).map((click, i) =>
      Math.round(((click.t - clicks[i].t) / 1000) * 100) / 100)
    const isCheckpoint = segment.sub === 1
    const payload = {
      userId: uid, chapterId: segment.chapterId, slideId: segment.slideId,
      durationMs: Math.max(0, Math.trunc(now - slideEnterTimeRef.current)),
      slideIndex: segment.index, subSlide: segment.sub,
      ...(lessonSessionId ? { sessionId: lessonSessionId } : {}),
      slideTotal: segment.total, revisitCount: segment.visits, isRevisit: segment.visits > 1,
      isCompleted, advanceTrigger: trigger, scrollDepth: segment.scrollDepth,
      interactionRaw: segment.raw,
      imageZoomCount: segment.sub === 0 ? imageZoomCountRef.current : null,
      checkboxOrderRaw: isCheckpoint ? clicks.map((click) => click.index) : null,
      checkboxIntervalsRaw: isCheckpoint ? intervals : null,
      checkboxClickInterval: isCheckpoint ? (intervals.length
        ? Math.round((intervals.reduce((sum, value) => sum + value, 0) / intervals.length) * 100) / 100 : 0) : null,
      checkboxTotal: isCheckpoint ? segment.checkboxTotal : null,
    }
    // 세션 exit와 독립된 구간 가드. HTTP 실패는 재전송 큐가 인계한다.
    segment.sent = true
    deliverBehaviorLog('/api/v1/lesson-log', payload, uid, exiting)
    slideEnterTimeRef.current = now
    return true
  }

  const changeLoggedPosition = (idx: number, sub: SubSlide, trigger: AdvanceTrigger, reentry = false) => {
    flushSlideLog(trigger)
    // 완료 화면 등 이미 전송한 구간의 대기 시간은 새 진입에 합산하지 않는다.
    if (slideLogRef.current?.sent) slideEnterTimeRef.current = Date.now()
    beginSlideLog(idx, sub, reentry)
    if (idx === slideIndex && sub === subSlide && bodyRef.current) observeScroll(bodyRef.current)
    setSlideIndex(idx)
    setSubSlide(sub)
  }

  // 세션 ID가 없어도 슬라이드·퀴즈 flush는 중단하지 않는다.
  const sendExit = () => {
    const uid = session?.user?.id
    if (!uid || consentBlocked) return
    flushSlideLog(null, true)
    if (lessonSessionId && !exitSentRef.current && !completedRef.current) {
      exitSentRef.current = true
      deliverBehaviorLog('/api/v1/chapter-session-log', {
        userId: uid, chapterId, action: 'exit', sessionId: lessonSessionId,
        pageType: 'lesson', isCompleted: showComplete,
        exitPoint: subSlide === 2 ? 'mini_quiz' : 'slide',
        lastSlide: slideIndex, lastSubSlide: subSlide,
      }, uid, true)
    }
    const pending = pendingQuizLogRef.current
    if (pending?.logId && !quizExitSentRef.current) {
      quizExitSentRef.current = true
      deliverBehaviorLog('/api/v1/quiz-performance-log', {
        mode: 'update', logId: pending.logId,
        quizBridgeTime: Math.round((Date.now() - pending.submittedAt) / 1000),
        afterWrongAction: 'exit', explanationViewed: pending.explanationViewed,
      }, uid, true)
    }
  }
  const sendExitRef = useRef(sendExit)
  sendExitRef.current = sendExit
  const resumeSlideRef = useRef(() => {})
  resumeSlideRef.current = () => {
    if (completedRef.current) return
    exitSentRef.current = false
    quizExitSentRef.current = false
    const backgroundStart = backgroundStartRef.current
    if (slideLogRef.current?.sent) {
      // 백그라운드 시간은 복귀 구간의 원본 신호로 분리하고 체류 초에 중복 합산하지 않는다.
      slideEnterTimeRef.current = Date.now()
      beginSlideLog(slideIndex, subSlide, false, true)
    }
    if (backgroundStart != null && slideLogRef.current && !slideLogRef.current.sent) {
      slideLogRef.current.raw[IK.backgroundMs] = Date.now() - backgroundStart
    }
    backgroundStartRef.current = null
    if (bodyRef.current) observeScroll(bodyRef.current)
  }

  useEffect(() => {
    const onExit = () => sendExitRef.current()
    const onVisibility = () => {
      if (document.hidden) {
        if (backgroundStartRef.current == null) {
          backgroundStartRef.current = Date.now()
          const segment = slideLogRef.current
          if (segment && !segment.sent) segment.raw[IK.tabSwitchCount] = Number(segment.raw[IK.tabSwitchCount]) + 1
        }
        onExit()
      } else resumeSlideRef.current()
    }
    const onPageShow = () => resumeSlideRef.current()
    window.addEventListener('beforeunload', onExit)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onExit)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      window.removeEventListener('beforeunload', onExit)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onExit)
      window.removeEventListener('pageshow', onPageShow)
      onExit()
    }
  }, [])

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

    const sortedCards = [...(qs ?? [])].sort((a, b) => {
      const aOrderMissing = a.order_index == null
      const bOrderMissing = b.order_index == null
      if (aOrderMissing !== bOrderMissing) return aOrderMissing ? 1 : -1
      if (!aOrderMissing && !bOrderMissing && a.order_index !== b.order_index) {
        return a.order_index - b.order_index
      }
      return a.id.localeCompare(b.id)
    })

    const allQ = sortedCards.filter(q =>
      q.answer_index !== null &&
      Array.isArray(q.options) &&
      q.options.length >= 2
    )
    setQuestions(allQ)

    const oralQs = sortedCards.filter(q => q.content_type === 'lesson' || q.question_format === 'short_answer')
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
      order_index: q.order_index ?? null,
    }))
    setSlides(slideArray)
    miniQuizAssignmentsRef.current = buildMiniQuizAssignmentMap(slideArray, allQ)

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

  // 조회 완료 후 첫 카드의 첫 단계로 진입한다. 퀴즈부터 시작하면 구성도 먼저 수행한다.
  useEffect(() => {
    if (!isShootMode) return
    if (loading || loadError || consentBlocked || slides.length === 0) return
    if (orderEntryRef.current?.slides === slides && orderEntryRef.current.style === shootStyle) return
    goToCard(0, firstSubFor(0), 'auto')
    const entry = { slides, style: shootStyle }
    orderEntryRef.current = entry
    setOrderEntry(entry)
  }, [slides, shootStyle, isShootMode, loading, loadError, consentBlocked]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 최초 진입/조회 후 구간 시작. 이동 핸들러가 이미 시작한 구간은 유지한다. ── */
  useEffect(() => {
    if (loading || consentBlocked || showComplete || !orderReady) return
    const segment = slideLogRef.current
    if (!segment || segment.chapterId !== chapterId ||
        segment.slideId !== slides[slideIndex]?.id || segment.sub !== subSlide) {
      if (segment) flushSlideLog()
      beginSlideLog(slideIndex, subSlide)
    } else if (segment.sent && !document.hidden) {
      resumeSlideRef.current()
    }
    if (bodyRef.current) observeScroll(bodyRef.current)
  }, [slides, slideIndex, subSlide, loading, consentBlocked, showComplete, chapterId, orderReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // 기존 타이머는 진행률만 갱신한다. 자동 카드 이동을 새로 만들지 않는다.
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (loading || consentBlocked || slideMode !== 'auto' || subSlide === 2) return
    setAutoProgress(0)
    timerRef.current = setInterval(() => {
      setAutoProgress((p) => Math.min(p + 2, 100))
    }, 100)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [slideMode, slideIndex, subSlide, loading, consentBlocked])

  /* ── 미니퀴즈 로그 마무리 (다음 카드로 넘어갈 때 bridge_time·explanation_viewed UPDATE) ── */
  // attempt 본체는 제출 시 이미 INSERT됨. 여기선 생성된 row(logId)에 이탈까지의 값만 갱신.
  const flushQuizLog = () => {
    const p = pendingQuizLogRef.current
    pendingQuizLogRef.current = null
    if (!p || !p.logId || !session?.user?.id) return
    deliverBehaviorLog('/api/v1/quiz-performance-log', {
      mode: 'update',
      logId: p.logId,
      quizBridgeTime: Math.round((Date.now() - p.submittedAt) / 1000), // 제출~다음 카드(초)
      afterWrongAction: 'next',
      explanationViewed: p.explanationViewed,
    }, session.user.id)
  }

  /* ── 카드 이동 헬퍼 ─────────────────────────────────── */
  const goToCard = (idx: number, sub: SubSlide = 0, trigger: AdvanceTrigger = 'button') => {
    flushQuizLog() // 이전 카드에 제출된 미니퀴즈 pending 로그가 있으면 전송
    if (sub === 2) {
      if (buildMiniQuizFor(idx)) {
        quizEnteredAtRef.current = Date.now()
      } else {
        sub = 0 // 구성 불가 시 기존 학습내용 진입으로 폴백
      }
    }
    changeLoggedPosition(idx, sub, trigger, true)
    setCheckedSentences([])
    setAutoProgress(0)
    // 카드 전환 → per-card 상호작용 집계 리셋 (슬라이드별 집계)
    imageZoomCountRef.current = 0
    checkboxClicksRef.current = []
    if (sub !== 2) setMiniQ(null)
    setMiniSelected(null)
    setMiniConfirmed(false)
    setExplanationRevealed(false)
  }

  const completeLesson = (trigger: AdvanceTrigger = 'button') => {
    flushSlideLog(trigger, false, true) // 봉인 전에 마지막 카드·단계의 체류 구간 전송
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
      deliverBehaviorLog('/api/v1/chapter-session-log', {
        userId:       session.user.id,
        chapterId,
        action:       'exit',
        sessionId:    lessonSessionId,
        pageType:     'lesson',
        isCompleted:  true,
        exitPoint:    'lesson_complete',
        lastSlide:    slideIndex,
        lastSubSlide: subSlide,
      }, session.user.id)
    }
    setShowComplete(true)
  }

  const goToNextCard = (trigger: AdvanceTrigger = 'button') => {
    if (slideIndex >= slides.length - 1) {
      completeLesson(trigger)
    } else {
      goToCard(slideIndex + 1, firstSubFor(slideIndex + 1), trigger)
    }
  }

  // 순열 판정 전용: 난수·state·ref 변경 없이 구성 가능 여부만 확인한다.
  const canBuildMiniQuizFor = (idx: number): boolean => {
    const slideId = slides[idx]?.id
    if (!slideId) return false
    const assignedQuestionId = miniQuizAssignmentsRef.current.get(slideId)
    if (!assignedQuestionId) return false
    const q = questions.find((qq) => qq.id === assignedQuestionId)
    if (!q || q.answer_index === undefined || q.answer_index === null) return false
    const correctOriginalIndex = q.answer_index[0]
    if (correctOriginalIndex === undefined || !q.options[correctOriginalIndex]) return false
    return q.options.some((_, originalIndex) => !q.answer_index?.includes(originalIndex))
  }

  const orderFor = (idx: number): SubSlide[] => {
    const hasQuiz = canBuildMiniQuizFor(idx)
    return SHOOT_SUB_SLIDE_ORDERS[shootStyle].filter((sub) => sub !== 2 || hasQuiz)
  }
  const firstSubFor = (idx: number): SubSlide => orderFor(idx)[0]
  const nextSubFor = (idx: number, sub: SubSlide): SubSlide | null => {
    const order = orderFor(idx)
    const cursor = order.indexOf(sub)
    return cursor < 0 ? null : order[cursor + 1] ?? null
  }
  const prevSubFor = (idx: number, sub: SubSlide): SubSlide | null => {
    const order = orderFor(idx)
    const cursor = order.indexOf(sub)
    return cursor < 0 ? null : order[cursor - 1] ?? null
  }

  // 챕터 로드 시 고정한 linked/폴백 배정으로 슬라이드3 데이터를 구성. 실패 시 false 반환
  // (건너뛰기는 호출부에서 처리) — 문항 순환 재사용/생성형 폴백 없음
  // TODO: 문제은행 확장(개념당 quiz 2~3개) 후, 재도전 시 미출제 문항 우선 출제로 전환
  const buildMiniQuizFor = (idx: number): boolean => {
    const slideId = slides[idx]?.id
    if (!slideId) return false
    const assignedQuestionId = miniQuizAssignmentsRef.current.get(slideId)
    if (!assignedQuestionId) return false

    const q = questions.find((qq) => qq.id === assignedQuestionId)
    if (!q || q.answer_index === undefined || q.answer_index === null) return false

    const correctOriginalIndex = q.answer_index[0]
    if (correctOriginalIndex === undefined) return false
    const correct = q.options[correctOriginalIndex]
    const wrongOptions = q.options
      .map((option, originalIndex) => ({ option, originalIndex }))
      .filter(({ originalIndex }) => !q.answer_index?.includes(originalIndex))
    if (!correct || wrongOptions.length === 0) return false

    const wrongOpt = wrongOptions[Math.floor(Math.random() * wrongOptions.length)]
    const aIsCorrect = Math.random() > 0.5
    setMiniQ({
      id: q.id,
      text: q.question,
      explanation: q.explanation,
      imageUrl: q.image_url ?? null,
      options: aIsCorrect ? [correct, wrongOpt.option] : [wrongOpt.option, correct],
      originalIndices: aIsCorrect
        ? [correctOriginalIndex, wrongOpt.originalIndex]
        : [wrongOpt.originalIndex, correctOriginalIndex],
      answerIdx: aIsCorrect ? 0 : 1,
    })
    setMiniSelected(null)
    setMiniConfirmed(false)
    setExplanationRevealed(false)
    return true
  }

  /* ── 슬라이드 전진(스와이프 좌 / 다음 버튼 / 화살표) ─── */
  const advance = (trigger: AdvanceTrigger = 'button') => {
    if (subSlide === 1) {
      if (slideMode === 'manual' && !allChecked) { showToast('모든 항목을 체크해주세요'); return }
    }
    if (subSlide === 2) {
      if (!miniConfirmed) { showToast('문제를 풀어주세요'); return }
      const slide = slides[slideIndex]
      if (miniSelected === miniQ?.answerIdx && slide?.exam_years && slide.exam_years.length > 0) {
        setShowRelatedQuestions(true)
        return
      }
    }
    let next = nextSubFor(slideIndex, subSlide)
    if (!orderFor(slideIndex).includes(subSlide)) {
      // 순열에 없는 단계는 기존 0→1→2 이동 규칙으로 폴백한다.
      next = subSlide === 0 ? 1 : subSlide === 1 && canBuildMiniQuizFor(slideIndex) ? 2 : null
    }
    if (next === 2) {
      if (!buildMiniQuizFor(slideIndex)) { goToNextCard(trigger); return }
      quizEnteredAtRef.current = Date.now() // 슬라이드3 진입 시각 — response_time 기준점
    }
    if (next !== null) changeLoggedPosition(slideIndex, next, trigger)
    else goToNextCard(trigger)
  }

  /* ── 슬라이드 후진(스와이프 우 / 이전 버튼) ───────────── */
  const goBack = () => {
    let previous = prevSubFor(slideIndex, subSlide)
    if (!orderFor(slideIndex).includes(subSlide) && subSlide > 0) {
      previous = subSlide === 2 ? 1 : 0
    }
    if (previous !== null) {
      if (previous === 2) {
        if (!buildMiniQuizFor(slideIndex)) return
        quizEnteredAtRef.current = Date.now()
      }
      changeLoggedPosition(slideIndex, previous, 'back', true)
      return
    }
    if (slideIndex > 0) {
      goToCard(slideIndex - 1, firstSubFor(slideIndex - 1), 'back')
    }
  }

  // 오답 후 "다시 학습하기" — 체크포인트(1)가 아니라 학습내용(0)부터 다시 보게 함
  const retryFromWrong = () => {
    changeLoggedPosition(slideIndex, 0, 'retry', true)
    setCheckedSentences([])
    setMiniQ(null)
    setMiniSelected(null)
    setMiniConfirmed(false)
    setExplanationRevealed(false)
  }

  // 퀴즈 후 계속/관련문제 닫기도 남은 단계를 먼저 진행한다.
  const continueInOrder = () => {
    const next = nextSubFor(slideIndex, subSlide)
    if (next === null) { goToNextCard(); return }
    changeLoggedPosition(slideIndex, next, 'button')
  }

  const continueAfterWrong = () => {
    const slide = slides[slideIndex]
    if (slide?.exam_years && slide.exam_years.length > 0) {
      setShowRelatedQuestions(true)
    } else {
      continueInOrder()
    }
  }

  const handleMiniConfirm = () => {
    if (miniSelected === null) { showToast('문제를 풀어주세요'); return }
    if (miniConfirmed || !miniQ) return
    setMiniConfirmed(true)
    const correct = miniSelected === miniQ.answerIdx
    const selectedOriginalIndex = miniQ.originalIndices[miniSelected]
    miniTotalRef.current   += 1
    if (correct) miniCorrectRef.current += 1

    // ── per-attempt 로그용 정보 보관(제출 시점) — 다음 카드 이탈 시 quiz_performance_logs로 flush ──
    // ── mini-quiz-complete의 recordAnswer가 attempt INSERT 후 logId를 반환 ──
    const submittedAt = Date.now()
    const responseTime = quizEnteredAtRef.current != null
      ? Math.round((submittedAt - quizEnteredAtRef.current) / 1000) // 진입~제출(초)
      : null
    const explanationViewed0 = correct ? false : true // 오답=해설 자동노출→true, 정답=아직 "해설 보기" 안 누름
    pendingQuizLogRef.current = { logId: null, submittedAt, explanationViewed: explanationViewed0 }

    fetch('/api/v1/mini-quiz-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterId,
        subjectId:  localStorage.getItem(SUBJECT_KEY) ?? '',
        questionId: miniQ.id,
        correct,
        selectedIndex: selectedOriginalIndex,
        selectedIndexIsOriginal: true,
        userId: session?.user?.id ?? '',
        certId,
        responseTime,
        quizEnteredAt: quizEnteredAtRef.current != null
          ? new Date(quizEnteredAtRef.current).toISOString() : null,
        afterWrongAction: correct ? null : 'explanation',
        explanationViewed: explanationViewed0,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.logId && pendingQuizLogRef.current) {
          pendingQuizLogRef.current.logId = d.logId
        }
      })
      .catch(() => {})
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
      advance('swipe')
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

  if (loading || (!loadError && slides.length > 0 && !orderReady)) {
    return <LoadingState status="loading" />
  }

  if (loadError) {
    return <LoadingState status="error" onRetry={() => { void loadLesson(true) }} />
  }

  const styleMeta    = getLearningTypeMeta(style)
  const isConcise    = styleMeta?.lessonMode === 'concise'
  const currentSlide = slides[slideIndex]
  const subSlideOrder = orderFor(slideIndex)
  const subSlideCursor = subSlideOrder.indexOf(subSlide)
  const nextSub = nextSubFor(slideIndex, subSlide)
  const nextStepLabel = nextSub === 0 ? '학습 내용'
    : nextSub === 1 ? '핵심 포인트 체크'
    : nextSub === 2 ? '확인 퀴즈'
    : null
  const cardEndLabel = slideIndex >= slides.length - 1 ? '학습 완료 🎉' : '다음 카드 →'

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
    <div
      className="min-h-screen bg-[#F5F5F3] flex flex-col"
      onPointerDownCapture={(event) => {
        pointerMethodRef.current = event.pointerType
        observeInteraction(event.pointerType)
      }}
      onKeyDownCapture={() => observeInteraction('keyboard')}
      onClickCapture={observeTap}
    >

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
            {subSlideOrder.map((sub, cursor) => (
              <div
                key={sub}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  subSlideCursor === cursor ? 'w-5 bg-[#00A651]' : 'w-1.5 bg-[#E5E5E5]'
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
              disabled={slideIndex === 0 && subSlideCursor <= 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center shadow-sm disabled:opacity-20 transition-opacity"
            >
              <ChevronLeft size={16} className="text-[#6B6B6B]" />
            </button>
            <button
              onClick={() => advance('arrow')}
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
                <div ref={bodyRef} onScroll={(event) => observeScroll(event.currentTarget)} className="flex-1 overflow-y-auto">
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
                        imageZoomCountRef.current += 1
                        observeImageZoom(currentSlide.id) // 로컬 카운터만 증가 (네트워크 호출 없음)
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
                <div ref={bodyRef} onScroll={(event) => observeScroll(event.currentTarget)} className="flex-1 overflow-y-auto">
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
                              const segment = slideLogRef.current
                              if (segment && !segment.sent && !isChecked) {
                                if (segment.checkedOnce.has(i)) {
                                  segment.raw[IK.checkboxRecheckCount] = Number(segment.raw[IK.checkboxRecheckCount] ?? 0) + 1
                                }
                                segment.checkedOnce.add(i)
                              }
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
                <div ref={bodyRef} onScroll={(event) => observeScroll(event.currentTarget)} className="flex-1 overflow-y-auto">
                  <p className="text-[14px] font-semibold text-[#1A1A1A] mb-3 leading-snug">
                    {miniQ.text}
                  </p>

                  {/* 문제 그림 (있을 때만 — 탭하면 확대). 그림 보고 맞히는 유형은
                      자세히 봐야 하므로 슬라이드1과 동일한 확대 오버레이 재사용 */}
                  {miniQ.imageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        observeImageZoom(miniQ.id)
                        setZoomImageUrl(miniQ.imageUrl)
                      }}
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
                    goToCard(i, firstSubFor(i), 'progressbar')
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
              onClick={() => advance('button')}
              className="w-full py-4 bg-[#00A651] text-white rounded-2xl text-[16px] font-bold"
            >
              {isShootMode && nextStepLabel !== null
                ? nextStepLabel
                : slideIndex >= slides.length - 1 ? '학습 완료 🎉' : '다음 카드 →'}
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
              onClick={() => advance('button')}
              disabled={!allChecked}
              className={`w-full py-4 rounded-2xl text-[16px] font-bold transition-all ${
                allChecked ? 'bg-[#00A651] text-white' : 'bg-[#E5E5E5] text-[#ADADAD]'
              }`}
            >
              {isShootMode ? (nextStepLabel ?? cardEndLabel) : '확인 퀴즈'}
            </button>
          ) : (
            <div className="w-full py-4 text-center text-[14px] text-[#6B6B6B] font-medium">
              ▶️ 자동 학습 중... ({slideIndex + 1}/{slides.length})
            </div>
          )
        ) : (
          <button
            onClick={() => advance('button')}
            className="w-full py-4 bg-[#00A651] text-white rounded-2xl text-[16px] font-bold"
          >
            {isShootMode ? (nextStepLabel ?? cardEndLabel) : '다음'}
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
              completedRef.current = false
              exitSentRef.current = false
              goToCard(0, firstSubFor(0), 'retry')
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
              onClick={() => { setShowRelatedQuestions(false); continueInOrder() }}
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
                  continueInOrder()
                }}
                className="w-full py-4 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold"
              >
                {isShootMode && nextStepLabel !== null
                  ? nextStepLabel
                  : slideIndex >= slides.length - 1 ? '학습 완료 🎉' : '다음 카드로 →'}
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
