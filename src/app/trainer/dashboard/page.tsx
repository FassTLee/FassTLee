'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Image from 'next/image'
import { useSession, signOut, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ChevronRight, Plus, Heart,
  Calendar, Clock, MapPin, X, Trash2, Bell,
} from 'lucide-react'
import BottomTabBar from '@/components/common/BottomTabBar'
import { KakaoAdFit } from '@/components/ads/KakaoAdFit'
import PhoneRegisterModal from '@/components/PhoneRegisterModal'
import { ALL_VIDEOS, HOME_VIDEO_COUNT } from '@/lib/videos'

type Tab = 'home' | 'classroom' | 'exam' | 'profile'

const SUBJECTS_KEY  = 'kinepia_selected_subjects'
const CERT_KEY      = 'kinepia_selected_cert'
const STYLE_KEY     = 'kinepia_learning_style'
const ADMIN_EMAILS  = ['shotace@naver.com', 'prehabex@naver.com']

const CERT_LABELS: Record<string, string> = {
  'health-exercise-manager':       '운동건강관리사',
  'sports-instructor-2':           '2급 생활스포츠지도사',
  'sports-instructor':             '생활스포츠지도사',
  'exercise-prescriptionist':      '건강운동관리사',
  'sports-instructor-2-written':   '2급 생활스포츠지도사 필기',
  'sports-instructor-2-practical': '2급 생활스포츠지도사 구술/실기',
}

const CERT_ICONS: Record<string, string> = {
  '건강운동관리사':                '🏅',
  '2급 생활스포츠지도사 필기':      '📝',
  '2급 생활스포츠지도사 구술/실기': '🏋️',
}

// 구술/실기 보디빌딩 과목 → courseId 매핑
const BODYBUILD_COURSES: Record<string, string> = {
  '도핑 규정':         'b28e78c8-8443-4013-bfef-dbe655c72994',
  '보디빌딩1':         '13f8cdb4-651e-4eba-9cfa-571465cbc905',
  '보디빌딩2':         '67cfd191-fc7f-4d57-9124-096ac4e8c40c',
  '생활체육 지도 방법': 'add57a42-adb5-4b75-9960-0ccc409c0341',
  '스포츠 인권':        '24885dc7-5442-481e-81fc-d7a222f76a25',
  '응급처치':           '947a8cf1-1ed8-4dcb-9379-263000ef49cf',
  '협회 규정':          '2c72f373-253d-41fc-b1d5-e156f485043e',
}

// 구술/실기 보디빌딩 과목 → subjectId 매핑
const BODYBUILD_SUBJECTS: Record<string, string> = {
  '도핑 규정':         '6944e483-027e-4009-93e9-5826ac992d8a',
  '보디빌딩1':         '054b7ae7-59df-4f65-b357-5d64d7617cb5',
  '보디빌딩2':         '054b7ae7-59df-4f65-b357-5d64d7617cb5',
  '생활체육 지도 방법': '7b8b495b-5897-4de9-acf8-0557c5938ad2',
  '스포츠 인권':        '77119580-8805-4865-a705-65d515017771',
  '응급처치':           'b967339b-0195-4b7e-bceb-6ff1f4fc60f9',
  '협회 규정':          '01340b0e-af8a-4b8a-93bc-6ae11b3b2c54',
}

// 자격증별 필수/선택 과목 구분 (건강운동관리사는 certification_subjects API로 동적 조회)
const REQUIRED_SUBJECTS: Record<string, string[]> = {
  'sports-instructor-2': [
    '스포츠심리학', '운동생리학', '스포츠교육학', '운동역학',
    '한국체육사', '스포츠사회학',
  ],
  'sports-instructor': [
    '스포츠심리학', '운동생리학', '스포츠교육학', '운동역학',
    '한국체육사', '스포츠사회학',
  ],
}

const SUBJECT_META: Record<string, { icon: string; desc: string }> = {
  '운동생리학':    { icon: '🫀', desc: '심폐기능·에너지 대사' },
  '기능해부학':    { icon: '🦴', desc: '근육·뼈대·관절 구조' },
  '건강·체력평가': { icon: '📊', desc: '체력검사·측정·평가' },
  '운동처방론':    { icon: '📋', desc: 'FITT 원칙·운동 처방' },
  '운동부하검사':  { icon: '🏃', desc: '심전도·부하 프로토콜' },
  '운동상해':      { icon: '🩹', desc: '손상·응급처치·재활' },
  '병태생리학':    { icon: '🔬', desc: '질환 발생 원리' },
  '스포츠심리학':  { icon: '🧠', desc: '동기·루틴·심리기술' },
  '한국체육사':    { icon: '🏛️', desc: '한국 체육의 역사' },
  '스포츠교육학':  { icon: '📚', desc: '교수법·코칭 이론' },
  '스포츠윤리':    { icon: '⚖️', desc: '페어플레이·반도핑' },
  '운동역학':      { icon: '⚙️', desc: '운동의 물리적 원리' },
  '스포츠사회학':  { icon: '🏟️', desc: '스포츠와 사회' },
  '도핑 규정':        { icon: '💊', desc: '도핑 검사·금지 약물' },
  '보디빌딩 경기 규정': { icon: '🏆', desc: '경기 규정·심사 기준' },
  '복장 및 포징 규정': { icon: '👔', desc: '복장·포징 규정' },
  '생활체육 지도 방법': { icon: '🎽', desc: '지도법·코칭 이론' },
  '스포츠 인권':      { icon: '⚖️', desc: '인권·페어플레이' },
  '운동영양학':       { icon: '🥩', desc: '영양소·식이 전략' },
  '응급처치':         { icon: '🚑', desc: '응급처치·안전 관리' },
  '협회 규정':        { icon: '📋', desc: '협회 규정·절차' },
}

const STYLE_META: Record<string, { emoji: string; label: string; desc: string; color: string }> = {
  conceptualizer: { emoji: '💡', label: '이해형',  desc: '개념을 먼저 이해하고 응용하는 스타일',        color: '#F5A623' },
  memorizer:      { emoji: '🧠', label: '암기형',  desc: '반복과 암기로 실력을 쌓아가는 스타일',        color: '#6C63FF' },
  planner:        { emoji: '📅', label: '계획형',  desc: '체계적인 계획으로 꾸준히 나아가는 스타일',    color: '#00A651' },
  intensive:      { emoji: '🔥', label: '강제형',  desc: '집중 훈련으로 단기간에 성과를 내는 스타일',   color: '#E24B4A' },
}

const CERT_EXAM_DATES: Record<number, string> = {
  2026: '2026-06-13',
  2027: '2027-06-12',
  2028: '2028-06-14',
}


interface ChapterStat {
  chapter_id: string
  avg_score: number
  wrong_rate: number
  total_attempts: number
  last_attempt_at: string | null
  latest_score?: number | null
  best_score?: number | null
  test_attempts?: number
  lesson_completed?: boolean
}

interface VideoBookmark {
  id: string
  video_url: string
  video_title: string
  video_thumbnail: string
}

interface SubjectCard {
  name: string
  icon: string
  desc: string
  subjectId: string | null
}

interface ActivityItem {
  chapter_id: string
  chapter_title: string
  subject_name: string
  date: string | null
  score: number
  bestScore: number | null
}

interface DayGoal {
  id: string
  cert_type: string
  exam_target_date: string
}

interface TodayChapter {
  chapterId: string
  title: string
  subjectName: string
  subjectId: string
  total: number
  completed: number
}

interface UserCertification {
  id: string
  user_id: string
  cert_id: string
  cert_label: string
  subjects: string[]
  exam_type: string
  is_active: boolean
  order_index: number
  added_at: string
  last_studied_at: string | null
}

interface OralExamRegistration {
  id: string
  user_id: string
  exam_date: string
  ticket_number: number
  start_time: string
  slot_number: number
  week_number: number
  certification_id: string
  is_completed: boolean
  created_at: string
}

function MarqueeText({ text, className }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState(false)

  useEffect(() => {
    const measure = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx && containerRef.current) {
        const style = window.getComputedStyle(containerRef.current)
        ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        const textWidth = ctx.measureText(text).width
        const containerWidth = containerRef.current.clientWidth
        setOverflow(textWidth > containerWidth)
      }
    }
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(measure)
    })
    return () => cancelAnimationFrame(raf)
  }, [text])

  return (
    <div ref={containerRef} className="overflow-hidden max-w-[120px]">
      {overflow ? (
        <div className="flex animate-marquee whitespace-nowrap">
          <span className={className}>{text}&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <span className={className}>{text}&nbsp;&nbsp;&nbsp;&nbsp;</span>
        </div>
      ) : (
        <span className={className}>{text}</span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
/* Wrap in Suspense so useSearchParams works in App Router */
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // 주요 페이지 prefetch — 이동 시 즉시 로드
  useEffect(() => {
    router.prefetch('/lesson/[chapterId]')
    router.prefetch('/test/[chapterId]')
    router.prefetch('/chapters/[subjectId]')
    router.prefetch('/oral-exam/[courseId]')
  }, [router])

  const searchParams = useSearchParams()
  const tabParam = (searchParams.get('tab') ?? 'home') as Tab

  const [tab, setTab] = useState<Tab>(tabParam)

  /* ── 로그인 유도 바텀시트 ───────────────────────────────────────── */
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  /* Sync tab when URL search param changes (BottomTabBar navigation) */
  useEffect(() => {
    if (status === 'loading') return
    // classroom · exam · profile 탭은 로그인 필요
    if ((tabParam === 'profile' || tabParam === 'classroom' || tabParam === 'exam') && !session) {
      setShowLoginPrompt(true)
      return
    }
    setTab(tabParam)
  }, [tabParam, session, status])
  const [loading, setLoading] = useState(true)

  /* ── Common ──────────────────────────────────────────────────────── */
  const [certLabel, setCertLabel] = useState('')
  const [certKey, setCertKey]     = useState('')
  const [subjects, setSubjects]   = useState<string[]>([])
  const [style, setStyle]         = useState<string | null>(null)
  const [styleType, setStyleType] = useState<string | null>(null)
  const [_userName, setUserName]  = useState('')

  /* ── Profile Me ──────────────────────────────────────────────────── */
  const [profileName, setProfileName]       = useState<string | null>(null)
  const [profileAvatar, setProfileAvatar]   = useState<string | null>(null)
  const [avatarError, setAvatarError]       = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [profileCert, setProfileCert]       = useState<string | null>(null)
  const [profileExamDate, setProfileExamDate] = useState<string | null>(null)
  const [streak, setStreak]                 = useState(0)

  /* ── Home ────────────────────────────────────────────────────────── */
  const [studiedToday, setStudiedToday]   = useState(false)
  const [recentActivity, setRecentActivity]   = useState<ActivityItem[]>([])
  const [heartedVideos, setHeartedVideos] = useState<Record<string, boolean>>({})
  const [subjectCards, setSubjectCards]   = useState<SubjectCard[]>([])
  const [recentStats, setRecentStats]         = useState<ChapterStat[]>([])
  const [allStats, setAllStats]               = useState<ChapterStat[]>([])
  const [chapterSubjectMap, setChapterSubjectMap] = useState<Record<string, string>>({})
  const [playingIdx, setPlayingIdx]           = useState<number | null>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  /* ── D-Day goals ─────────────────────────────────────────────────── */
  const [ddayGoals, setDdayGoals]         = useState<DayGoal[]>([])
  const [showDDayModal, setShowDDayModal] = useState(false)
  const [ddayNewCert, setDdayNewCert]     = useState('건강운동관리사')
  const [ddayNewDate, setDdayNewDate]     = useState('')
  const [savingDDay, setSavingDDay]       = useState(false)

  /* ── Today chapter thumbnail ─────────────────────────────────────── */
  const [todayChapter, setTodayChapter]   = useState<TodayChapter | null>(null)
  const [todayChapterState, setTodayChapterState] = useState<'lesson' | 'test_start' | 'test_retry' | null>(null)

  /* ── Classroom (lazy) ────────────────────────────────────────────── */
  const [bookmarks, setBookmarks]             = useState<VideoBookmark[]>([])
  const [classroomLoaded, setClassroomLoaded] = useState(false)
  const [expandedCertId, setExpandedCertId]         = useState<string | null>(null)
  const [certOpen, setCertOpen]         = useState(false)
  const [methodOpen, setMethodOpen]     = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [certOrder, setCertOrder]                                     = useState<string[]>([])
  const [subjectOrderByCert, setSubjectOrderByCert]                   = useState<Record<string, string[]>>({})
  const [subjectProgress, setSubjectProgress] = useState<Record<string, { total: number; completed: number }>>({})
  const [userCerts, setUserCerts]             = useState<UserCertification[]>([])

  /* ── 모의고사 ────────────────────────────────────────────────────── */
  const [selectedExamCert, setSelectedExamCert] = useState<string | null>(null)
  const [oralRegs, setOralRegs] = useState<OralExamRegistration[]>([])
  const [oralLoading, setOralLoading] = useState(false)
  const [showOralDatePicker, setShowOralDatePicker] = useState(false)
  const [oralPickerTarget, setOralPickerTarget] = useState<{ weekNum: number; slot: number; weekDates: string[] } | null>(null)
  const [oralPickerDate, setOralPickerDate] = useState<string | null>(null)
  const [showOralTicket, setShowOralTicket] = useState<OralExamRegistration | null>(null)
  const [showOralTimeError, setShowOralTimeError] = useState(false)
  const [showOralNoReg, setShowOralNoReg] = useState(false)
  const [oralSubmitting, setOralSubmitting] = useState(false)
  const [healthCertSubjects, setHealthCertSubjects] = useState<{ id: string; name: string }[]>([])

  /* ── 모의고사 모달 ───────────────────────────────────────────────── */
  const [examRound, setExamRound]                         = useState(1)
  const [showSubjectConfirmModal, setShowSubjectConfirmModal] = useState(false)
  const [showRegisteredModal, setShowRegisteredModal]     = useState(false)
  const [showExamInfoModal, setShowExamInfoModal]         = useState(false)
  const [showExamClosedModal, setShowExamClosedModal]     = useState(false)
  const [showExamNotYetModal, setShowExamNotYetModal]     = useState(false)

  /* ── 캘린더 월 이동 ─────────────────────────────────────────────── */
  const [calYear,  setCalYear]  = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth() + 1)
  const calTouchStartX      = useRef<number | null>(null)
  const surveyCompletedRef  = useRef(false)
  const [registeredRounds, setRegisteredRounds]           = useState<number[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('kinepia_registered_rounds') ?? '[]') } catch { return [] }
  })

  // D-Day 모달 열릴 때 건강운동관리사 기본 날짜 자동 추천
  useEffect(() => {
    if (!showDDayModal) return
    const isHealthExercise =
      profileCert?.includes('건강운동관리사') ||
      certLabel?.includes('건강운동관리사')
    if (isHealthExercise && !ddayNewDate) {
      setDdayNewDate('2026-06-13')
    }
  }, [showDDayModal]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Phone Modal ─────────────────────────────────────────────────── */
  const [showPhoneModal, setShowPhoneModal] = useState(false)

  /* ── Access Code Popup ───────────────────────────────────────────── */
  const [showCodePopup, setShowCodePopup]       = useState(false)
  const [codeInput, setCodeInput]               = useState('')
  const [codeError, setCodeError]               = useState<string | null>(null)
  const [codeSubmitting, setCodeSubmitting]     = useState(false)
  const [_accessCodeUsed, setAccessCodeUsed]     = useState<string | null>(null)

  /* ── 학습 유형 검사 팝업 ─────────────────────────────────────────── */
  // undefined = profile-me 로딩 중, null = 스타일 미설정(팝업 표시), string = 설정됨
  const [profileLearningStyle, setProfileLearningStyle] = useState<string | null | undefined>(undefined)

  /* ── certification_subjects DB 데이터 ───────────────────────────── */
  const [dbRequiredNames, setDbRequiredNames] = useState<string[]>([])
  const [dbGoalSubjects, setDbGoalSubjects]   = useState<{ name: string; is_required: boolean }[]>([])

  /* ── Profile ─────────────────────────────────────────────────────── */
  const [examDateInput, setExamDateInput]     = useState('')
  const [certTypeInput, setCertTypeInput]     = useState('')
  const [regionInput, setRegionInput]         = useState('')
  const [dailyHoursInput, setDailyHoursInput] = useState('')
  const [studyTimeInput, setStudyTimeInput]   = useState('')
  const [studyCountInput, setStudyCountInput] = useState('')
  const [studyTimeSlotInput, setStudyTimeSlotInput] = useState('')
  const [_pushEnabled, _setPushEnabled]       = useState(false)
  const [_settingsOpen, _setSettingsOpen]     = useState(false) // unused — preserved for future use
  const [savingProfile, setSavingProfile]     = useState(false)

  // ── 이용 설문 팝업 ──────────────────────────────────────────────────
  const [subjectStarStats, setSubjectStarStats] = useState<Record<string, { fire: number; star: number }>>({})

  const [showSurveyPopup, setShowSurveyPopup]                   = useState(false)
  const [hasShownSurveyThisSession, setHasShownSurveyThisSession] = useState(false)
  const [surveyStep, setSurveyStep]         = useState(0)
  const [surveyQ1, setSurveyQ1]             = useState('')
  const [surveyQ2, setSurveyQ2]             = useState('')
  const [surveyQ1Temp, setSurveyQ1Temp]     = useState('')
  const [surveyQ2Temp, setSurveyQ2Temp]     = useState('')
  const [surveyStars, setSurveyStars]           = useState(0)
  const [surveyText, setSurveyText]             = useState('')
  const [surveyFeedback, setSurveyFeedback]     = useState('')
  const [surveyConsent, setSurveyConsent]       = useState(false)
  const [surveyLoading, setSurveyLoading]       = useState(false)
  const [surveyDone, setSurveyDone]             = useState(false)
  const [showToast, setShowToast]               = useState(false)
  const [toastMessage, setToastMessage]         = useState('')

  // ── Init ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      setLoading(false)  // 비로그인도 대시보드 렌더링 허용
      return
    }
    if ((session as { error?: string } | null)?.error === 'RefreshTokenExpired') {
      signOut({ callbackUrl: '/trainer/dashboard' })
      return
    }
    initCommon()
  }, [status, session, router]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 구술/실기 과목별 star_rating 집계 ──────────────────────────────────
  useEffect(() => {
    const fetchSubjectStarStats = async () => {
      try {
        const courseIds = Object.values(BODYBUILD_COURSES)
        const { data } = await supabase
          .from('chapter_questions')
          .select('star_rating, chapters!inner(title, course_id)')
          .in('chapters.course_id', courseIds)
          .in('star_rating', [4, 5])
        if (!data) return
        const acc: Record<string, { fire: number; star: number }> = {}
        for (const row of data) {
          const chapter = row.chapters as unknown as { title: string; course_id: string } | null
          if (!chapter) continue
          // 챕터 타이틀 끝의 숫자(공백+숫자) 제거 → 과목명
          const subjectName = chapter.title.replace(/\s*\d+$/, '').trim()
          if (!acc[subjectName]) acc[subjectName] = { fire: 0, star: 0 }
          if (row.star_rating === 5) acc[subjectName].fire += 1
          else if (row.star_rating === 4) acc[subjectName].star += 1
        }
        setSubjectStarStats(acc)
      } catch { /* ignore */ }
    }
    fetchSubjectStarStats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === 'classroom' && !classroomLoaded) loadClassroom()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  /* certification_subjects — certKey 변경 시 필수/선택 목록 재조회 */
  useEffect(() => {
    if (!certKey) { setDbRequiredNames([]); return }
    fetch(`/api/v1/certification-subjects?certKey=${encodeURIComponent(certKey)}`)
      .then((r) => r.json())
      .then((d) => { setDbRequiredNames(d.required ?? []) })
      .catch(() => {})
  }, [certKey])

  /* certification_subjects — 목표 자격증(certTypeInput) 변경 시 */
  useEffect(() => {
    const key = Object.entries(CERT_LABELS).find(([, v]) => v === certTypeInput)?.[0] ?? ''
    if (!key) { setDbGoalSubjects([]); return }
    fetch(`/api/v1/certification-subjects?certKey=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d) => { setDbGoalSubjects(d.subjects ?? []) })
      .catch(() => {})
  }, [certTypeInput]) // eslint-disable-line react-hooks/exhaustive-deps

  /* 구술 모의고사 2뎁스 진입 시 신청 내역 조회 */
  useEffect(() => {
    if (selectedExamCert !== 'sports-instructor-2-practical') return
    setOralLoading(true)
    fetch('/api/v1/oral-exam-reg')
      .then((r) => r.json())
      .then((d) => { setOralRegs(d.data ?? []); setOralLoading(false) })
  }, [selectedExamCert])

  /* userCerts 로드 후 todayChapter가 여전히 null이면 initCommon 재시도 */
  useEffect(() => {
    if (userCerts.length === 0) return
    if (todayChapter !== null) return

    const subs = localStorage.getItem(SUBJECTS_KEY)
    let selectedNames: string[] = []
    if (subs) {
      try { selectedNames = JSON.parse(subs) } catch { /* ignore */ }
    }

    if (selectedNames.length === 0) {
      const fallback = userCerts.flatMap((c) => c.subjects ?? [])
      if (fallback.length > 0) {
        localStorage.setItem(SUBJECTS_KEY, JSON.stringify(fallback))
        initCommon()
      }
    }
  }, [userCerts]) // eslint-disable-line react-hooks/exhaustive-deps

  const initCommon = async () => {
    const cert     = localStorage.getItem(CERT_KEY)
    const subs     = localStorage.getItem(SUBJECTS_KEY)
    const styleVal = localStorage.getItem(STYLE_KEY)

    if (cert)     { setCertKey(cert); setCertLabel(CERT_LABELS[cert] ?? cert) }
    if (styleVal) setStyle(styleVal)
    const styleTypeVal = localStorage.getItem('kinepia_learning_type')
    if (styleTypeVal) setStyleType(styleTypeVal)
    if (session?.user?.name) setUserName(session.user.name.split(' ')[0])

    // userId: 이후 모든 API 호출에서 공통 사용
    const userId = session?.user?.id ?? ''

    // ── 병렬 fetch: profile-me · user-certifications · chapter-stats ──
    // 세 API는 서로 의존 관계 없으므로 동시에 요청해 왕복 시간 단축
    // eslint-disable-next-line prefer-const
    let pm: Record<string, unknown> = {}
    // eslint-disable-next-line prefer-const
    let certsData: { data?: UserCertification[] } = {}
    // eslint-disable-next-line prefer-const
    let statsRawData: { chapter_stats?: ChapterStat[] } = {}
    try {
      const [pmRes, certsRes, statsRes] = await Promise.all([
        fetch('/api/v1/profile-me', { cache: 'no-store' }),
        userId
          ? fetch(`/api/v1/user-certifications?userId=${encodeURIComponent(userId)}`)
          : Promise.resolve(new Response(JSON.stringify({}))),
        userId
          ? fetch(`/api/v1/report?userId=${encodeURIComponent(userId)}`)
          : Promise.resolve(new Response(JSON.stringify({}))),
      ])
      ;[pm, certsData, statsRawData] = await Promise.all([
        pmRes.json(),
        certsRes.json(),
        statsRes.json(),
      ])
    } catch (e) { console.warn('[initCommon] parallel fetch 실패', e) }

    // ── profile-me 결과 처리 ──
    let loadedExamDate: string | null = null
    let loadedCertType: string | null = null
    console.log('[initCommon] profile-me:', pm)
    if (pm.name)      setProfileName(pm.name as string)
    if (pm.avatarUrl) setProfileAvatar(pm.avatarUrl as string)
    if (pm.certType)  { loadedCertType = pm.certType as string; setProfileCert(pm.certType as string); setCertTypeInput(pm.certType as string) }
    if (pm.examDate)  { loadedExamDate = pm.examDate as string; setProfileExamDate(pm.examDate as string); setExamDateInput(pm.examDate as string) }
    if (pm.accessCodeUsed) setAccessCodeUsed(String(pm.accessCodeUsed))
    // 코드 팝업 — 챕터 1 테스트 완료 후로 이동
    // if (session && pm.codePopupShown === false) setShowCodePopup(true)
    surveyCompletedRef.current = Boolean(pm.surveyCompleted)
    const localLessonStyle = localStorage.getItem(STYLE_KEY)
    console.log('[stylePopup] pm.learningStyle:', pm.learningStyle, '| localStorage:', localLessonStyle,
      '| sessionStorage dismissed:', sessionStorage.getItem('kinepia_style_dismissed'),
      '| sessionStorage pending:', sessionStorage.getItem('kinepia_style_pending'))
    if (pm.learningStyle || localLessonStyle) {
      const resolved = (pm.learningStyle ?? localLessonStyle) as string
      console.log('[stylePopup] → 팝업 없음. resolved:', resolved)
      setProfileLearningStyle(resolved)
      sessionStorage.removeItem('kinepia_style_pending')

      // DB → localStorage 동기화: DB에 값 있고 localStorage에 없을 때
      if (pm.learningStyle && !localLessonStyle) {
        const dbStyle = pm.learningStyle as string
        localStorage.setItem(STYLE_KEY, dbStyle)
        // learning_type은 style과 동일값으로 역매핑 (memorizer→memorizer, conceptualizer→conceptualizer)
        if (!localStorage.getItem('kinepia_learning_type')) {
          localStorage.setItem('kinepia_learning_type', dbStyle)
        }
        console.log('[stylePopup] DB → localStorage 동기화:', dbStyle)
      }

      if (!pm.learningStyle && localLessonStyle) {
        console.log('[stylePopup] DB 없음, localStorage 있음 → 백그라운드 동기화 시도')
        fetch('/api/v1/learning-style', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ learning_style: localLessonStyle }),
        }).then(r => r.json()).then(j => console.log('[stylePopup] 동기화 결과:', j)).catch(() => {})
      }
    } else {
      const dismissed = sessionStorage.getItem('kinepia_style_dismissed')
      console.log('[stylePopup] → DB·localStorage 없음. dismissed:', dismissed, '→ popup:', !dismissed)
      setProfileLearningStyle(dismissed ? 'dismissed' : null)
    }

    // ── user-certifications 결과 처리 ──
    if (Array.isArray(certsData.data) && certsData.data.length > 0) {
      setUserCerts(certsData.data)
    }

    // selectedNames: localStorage 우선, 없으면 certsData 폴백
    let selectedNames: string[] = []
    if (subs) {
      try { selectedNames = JSON.parse(subs) } catch { /* ignore */ }
    }
    if (selectedNames.length === 0 && certsData.data && certsData.data.length > 0) {
      selectedNames = certsData.data.flatMap((c) => c.subjects ?? [])
      if (selectedNames.length > 0) {
        localStorage.setItem(SUBJECTS_KEY, JSON.stringify(selectedNames))
      }
    }

    // certType 기반 자동 조회 (user_certifications에 데이터 없는 경우 폴백)
    if (selectedNames.length === 0 && loadedCertType) {
      try {
        const certKey = Object.entries(CERT_LABELS).find(([, v]) => v === loadedCertType)?.[0] ?? ''
        if (certKey) {
          const csRes  = await fetch(`/api/v1/certification-subjects?certKey=${encodeURIComponent(certKey)}`)
          const csData = await csRes.json()
          const autoNames: string[] = (csData.subjects ?? []).map((s: { name: string }) => s.name)
          if (autoNames.length > 0) {
            selectedNames = autoNames
            localStorage.setItem(SUBJECTS_KEY, JSON.stringify(autoNames))
          }
        }
      } catch { /* ignore */ }
    }

    setSubjects(selectedNames)

    // ② profile-settings + user-goals 병렬 조회
    const [psRes, ugRes] = await Promise.allSettled([
      fetch(`/api/v1/profile-settings?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' }),
      fetch(`/api/v1/user-goals?userId=${encodeURIComponent(userId)}`),
    ])

    // profile-settings 처리
    if (psRes.status === 'fulfilled') {
      try {
        const data = await psRes.value.json()
        console.log('[initCommon] profile-settings:', data)
        if (data.exam_target_date) {
          loadedExamDate = data.exam_target_date
          setExamDateInput(data.exam_target_date)
          setProfileExamDate(data.exam_target_date)
        }
        if (data.cert_type) {
          loadedCertType = data.cert_type
          setCertTypeInput(data.cert_type)
          setProfileCert(data.cert_type)
        }
        if (data.cert_type) {
          localStorage.setItem('kinepia_cert_type', data.cert_type)
        }
        if (data.region)            setRegionInput(String(data.region))
        if (data.daily_study_hours) setDailyHoursInput(String(data.daily_study_hours))
        if (data.daily_study_time)  setStudyTimeInput(data.daily_study_time)
        if (data.daily_study_count) setStudyCountInput(data.daily_study_count)
        if (data.study_time_slot)   setStudyTimeSlotInput(data.study_time_slot)
        if (data.push_enabled !== undefined && data.push_enabled !== null)
          _setPushEnabled(Boolean(data.push_enabled))
      } catch (e) { console.warn('[initCommon] profile-settings 파싱 실패', e) }
    } else { console.warn('[initCommon] profile-settings 실패', psRes.reason) }

    // ③ D-Day goals — user-goals 테이블에서도 exam_date 폴백 확인
    if (ugRes.status === 'fulfilled') {
      try {
        const data = await ugRes.value.json()
        const goals: DayGoal[] = data.goals ?? []
        setDdayGoals(goals)
        // profile-me / profile-settings 모두 exam_date 반환 못한 경우 user-goals로 폴백
        if (!loadedExamDate && goals.length > 0) {
          const latest = goals[goals.length - 1]
          console.log('[initCommon] user-goals 폴백 exam_target_date:', latest.exam_target_date)
          setProfileExamDate(latest.exam_target_date)
          setExamDateInput(latest.exam_target_date)
          if (!loadedCertType && latest.cert_type) {
            setProfileCert(latest.cert_type)
            setCertTypeInput(latest.cert_type)
          }
        }
      } catch (e) { console.warn('[initCommon] user-goals 파싱 실패', e) }
    } else { console.warn('[initCommon] user-goals 실패', ugRes.reason) }

    // ④ localStorage 폴백 — 모든 DB 조회 실패 시 마지막 안전망
    if (!loadedExamDate) {
      const cached = localStorage.getItem('kinepia_exam_date')
      if (cached) {
        console.log('[initCommon] localStorage 폴백 exam_date:', cached)
        setProfileExamDate(cached)
        setExamDateInput(cached)
      }
    }
    if (!loadedCertType) {
      const cachedCert = localStorage.getItem('kinepia_cert_type')
      if (cachedCert) {
        console.log('[initCommon] localStorage 폴백 cert_type:', cachedCert)
        setProfileCert(cachedCert)
        setCertTypeInput(cachedCert)
      }
    }

    // Chapter stats (병렬 fetch에서 이미 수신한 결과 사용)
    const stats: ChapterStat[] = statsRawData.chapter_stats ?? []
    try {
      setAllStats(stats)

      // 설문 팝업: authenticated + 미완료 + 미표시 + 학습 기록 있음
      if (
        status === 'authenticated' &&
        !surveyCompletedRef.current &&
        !hasShownSurveyThisSession &&
        stats.length > 0
      ) {
        setTimeout(() => {
          setShowSurveyPopup(true)
          setHasShownSurveyThisSession(true)
        }, 1500)
      }

      const sorted = [...stats].sort((a, b) =>
        new Date(b.last_attempt_at ?? 0).getTime() - new Date(a.last_attempt_at ?? 0).getTime()
      )
      setRecentStats(sorted.slice(0, 3))

      // Studied today?
      const today = new Date().toDateString()
      setStudiedToday(sorted.some((s) => s.last_attempt_at && new Date(s.last_attempt_at).toDateString() === today))

      // 연속 학습일(streak) 계산
      const uniqueDates = Array.from(
        new Set(
          stats
            .filter((s) => s.last_attempt_at)
            .map((s) => new Date(s.last_attempt_at!).toDateString())
        )
      ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      let streakCount = 0
      const todayDate = new Date(); todayDate.setHours(0,0,0,0)
      for (let i = 0; i < uniqueDates.length; i++) {
        const d = new Date(uniqueDates[i]); d.setHours(0,0,0,0)
        const diffDays = Math.round((todayDate.getTime() - d.getTime()) / 86400000)
        if (diffDays === i || diffDays === i + 1) { streakCount++ } else break
      }
      setStreak(streakCount)

      // 챕터 → 과목 매핑 (ALL stats 기반 — 취약 과목 분석 + recentActivity 공용)
      const top5 = sorted.slice(0, 5)
      if (stats.length > 0) {
        const chIds = Array.from(new Set(stats.map((s) => s.chapter_id)))
        const { data: chs } = await supabase
          .from('chapters').select('id, title, course_id').in('id', chIds)
        const courseIds = Array.from(new Set((chs ?? []).map((c) => c.course_id)))
        const { data: courses } = await supabase
          .from('courses').select('id, subject_id').in('id', courseIds)
        const subjIds = Array.from(new Set((courses ?? []).map((c) => c.subject_id)))
        const { data: subjs } = await supabase
          .from('subjects').select('id, name').in('id', subjIds)

        const subjMap: Record<string, string>  = {}
        subjs?.forEach((s) => { subjMap[s.id] = s.name })
        const courseMap: Record<string, string> = {}
        courses?.forEach((c) => { courseMap[c.id] = c.subject_id })
        const chMap: Record<string, { title: string; course_id: string }> = {}
        chs?.forEach((c) => { chMap[c.id] = { title: c.title, course_id: c.course_id } })

        // chapter_id → subject_name 전체 맵 (취약 과목 분석용)
        const chSubMap: Record<string, string> = {}
        chs?.forEach((c) => {
          const subjId = courseMap[c.course_id]
          if (subjId) chSubMap[c.id] = subjMap[subjId] ?? ''
        })
        setChapterSubjectMap(chSubMap)

        // recentActivity: top 5만 표시
        setRecentActivity(
          top5.map((s) => ({
            chapter_id:    s.chapter_id,
            chapter_title: chMap[s.chapter_id]?.title ?? '챕터',
            subject_name:  subjMap[courseMap[chMap[s.chapter_id]?.course_id ?? ''] ?? ''] ?? '',
            date:          s.last_attempt_at,
            score:         s.avg_score,
            bestScore:     s.best_score ?? null,
          }))
        )
      }
    } catch { /* ignore */ }

    // Subject cards (needed for home + classroom)
    if (selectedNames.length > 0) {
      // cert_id로 직접 category_id 매핑 (resolvedCertLabel 타이밍 이슈 방지)
      const CERT_ID_CATEGORY_MAP: Record<string, string> = {
        'exercise-prescriptionist': '410d8994-8574-448a-9a6e-1c383bb2a009',
      }
      const currentCertId = Array.isArray(certsData.data) && certsData.data.length > 0
        ? certsData.data[0].cert_id
        : ''
      const categoryIdForSubj = CERT_ID_CATEGORY_MAP[currentCertId] ?? undefined
      // ── 기존 코드 (타이밍 이슈로 대체됨) ──
      // const CATEGORY_ID_MAP: Record<string, string> = {
      //   '건강운동관리사': '410d8994-8574-448a-9a6e-1c383bb2a009',
      // }
      // const resolvedCertLabel = loadedCertType ?? certTypeInput
      //   ?? (Array.isArray(certsData.data) && certsData.data.length > 0
      //     ? CERT_LABELS[certsData.data[0].cert_id] ?? ''
      //     : '')
      // const categoryIdForSubj = CATEGORY_ID_MAP[resolvedCertLabel] ?? undefined
      const subjQuery = supabase.from('subjects').select('id, name').in('name', selectedNames)
      const { data: dbSubjs } = categoryIdForSubj
        ? await subjQuery.eq('category_id', categoryIdForSubj)
        : await subjQuery
      const cards: SubjectCard[] = selectedNames.map((name) => {
        const meta = SUBJECT_META[name] ?? { icon: '📚', desc: '' }
        const db   = (dbSubjs ?? []).find((d: { id: string; name: string }) => d.name === name)
        return { name, icon: meta.icon, desc: meta.desc, subjectId: db?.id ?? null }
      })
      setSubjectCards(cards)

      // 과목별 진도율 계산 (강의실 탭용)
      let _todayCourseChaps: { id: string; title: string; order_index: number | null }[] = []
      try {
        const subjectIds = cards.filter((c) => c.subjectId).map((c) => c.subjectId!)
        if (subjectIds.length > 0) {
          const { data: allCourses } = await supabase
            .from('courses').select('id, subject_id').in('subject_id', subjectIds)
          const allCourseIds = (allCourses ?? []).map((c) => c.id)
          if (allCourseIds.length > 0) {
            // courses 조회 결과 기반으로 chapters + todayChapter courses 병렬 조회
            const firstSubjectId = cards.find((c) => c.subjectId)?.subjectId
            const firstCourseIds = (allCourses ?? [])
              .filter((c) => c.subject_id === firstSubjectId)
              .map((c) => c.id)
            const [{ data: allChaps }, { data: todayCourseChapsData }] = await Promise.all([
              supabase.from('chapters').select('id, course_id').in('course_id', allCourseIds),
              firstCourseIds.length > 0
                ? supabase.from('chapters').select('id, title, order_index').in('course_id', firstCourseIds)
                : Promise.resolve({ data: [] }),
            ])
            _todayCourseChaps = todayCourseChapsData ?? []
            const completedSet = new Set(
              stats.filter((s) => s.lesson_completed === true || (s.latest_score ?? s.avg_score) >= 80).map((s) => s.chapter_id)
            )
            const progressMap: Record<string, { total: number; completed: number }> = {}
            for (const card of cards) {
              if (!card.subjectId) continue
              const courseIds = (allCourses ?? [])
                .filter((c) => c.subject_id === card.subjectId)
                .map((c) => c.id)
              const chaps = (allChaps ?? []).filter((c) => courseIds.includes(c.course_id))
              progressMap[card.name] = {
                total: chaps.length,
                completed: chaps.filter((c) => completedSet.has(c.id)).length,
              }
            }
            setSubjectProgress(progressMap)
          }
        }
      } catch { /* ignore */ }

      // Today chapter thumbnail: first subject with chapters
      const firstCard = cards.find((c) => c.subjectId)
      if (firstCard?.subjectId) {
        try {
          // todayCourseChaps — 이미 위에서 병렬 조회한 결과 재사용 (별도 쿼리 제거)
          const chaps = _todayCourseChaps ?? []
          if (chaps.length > 0) {
            const sortedChaps = chaps.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
            const completedIds = new Set(
              (stats ?? []).filter((s) => s.lesson_completed === true || (s.latest_score ?? s.avg_score) >= 80).map((s) => s.chapter_id)
            )
            const total     = sortedChaps.length
            const completed = sortedChaps.filter((c) => completedIds.has(c.id)).length
            const nextChap  = sortedChaps.find((c) => !completedIds.has(c.id)) ?? sortedChaps[0]
            if (nextChap) {
              const chapStat = (stats ?? []).find((s: ChapterStat) => s.chapter_id === nextChap.id)

              let state: 'lesson' | 'test_start' | 'test_retry' = 'lesson'
              if (chapStat) {
                if (!chapStat.lesson_completed) {
                  state = 'lesson'
                } else if (!chapStat.test_attempts || chapStat.test_attempts === 0) {
                  state = 'test_start'
                } else {
                  state = 'test_retry'
                }
              }
              setTodayChapterState(state)

              setTodayChapter({
                chapterId:   nextChap.id,
                title:       nextChap.title,
                subjectName: firstCard.name,
                subjectId:   firstCard.subjectId,
                total,
                completed,
              })
            }
          }
        } catch { /* ignore */ }
      }
    }

    // 휴대폰 번호 팝업 — 결제 연동 시점에 재활성화 예정
    // try {
    //   const phoneRes  = await fetch('/api/v1/update-phone')
    //   const phoneData = await phoneRes.json()
    //   if (!phoneData.registered && !sessionStorage.getItem('phone_modal_dismissed')) {
    //     setShowPhoneModal(true)
    //   }
    // } catch { /* ignore */ }

    // 건강운동관리사 과목 동적 조회 (certification_subjects DB 기준)
    try {
      const hcsRes  = await fetch('/api/v1/certification-subjects?cert_id=feddb13b-91c9-461b-a6d5-a1efb0448f17')
      const hcsData = await hcsRes.json()
      if (Array.isArray(hcsData.subjects) && hcsData.subjects.length > 0) {
        setHealthCertSubjects(hcsData.subjects as { id: string; name: string }[])
      }
    } catch { /* ignore */ }

    // 챕터 1 테스트 완료 후 코드 팝업 표시 (sessionStorage 체크)
    if (session && sessionStorage.getItem('kinepia_show_code_popup') === 'true') {
      sessionStorage.removeItem('kinepia_show_code_popup')
      setShowCodePopup(true)
    }

    setLoading(false)
  }

  const loadClassroom = async () => {
    const uid = session?.user?.id ?? ''

    // 이미 로드된 경우 — stats만 재fetch하고 나머지 건너뜀
    if (classroomLoaded) {
      if (uid) {
        try {
          const statsRes = await fetch(`/api/v1/report?userId=${encodeURIComponent(uid)}`, { cache: 'no-store' })
          const statsData = await statsRes.json()
          setAllStats(statsData.chapter_stats ?? [])
        } catch { /* ignore */ }
      }
      return
    }

    // 1. user_certifications 최신 로드 (강의실 탭 최초 진입 시만)
    if (uid) {
      try {
        const ucRes  = await fetch(`/api/v1/user-certifications?userId=${uid}`)
        const ucData = await ucRes.json()
        if (Array.isArray(ucData.data) && ucData.data.length > 0) {
          setUserCerts(ucData.data as UserCertification[])
        }
      } catch { /* ignore */ }
    }

    // Refresh subject cards if not loaded yet
    if (subjectCards.length === 0 && subjects.length === 0) {
      try {
        const res  = await fetch('/api/v1/selected-subjects')
        const data = await res.json()
        if (Array.isArray(data.selected_subjects) && data.selected_subjects.length > 0) {
          const names: string[] = data.selected_subjects
          setSubjects(names)
          localStorage.setItem(SUBJECTS_KEY, JSON.stringify(names))
          const { data: dbSubjs } = await supabase
            .from('subjects').select('id, name').in('name', names)
          setSubjectCards(names.map((name) => {
            const meta = SUBJECT_META[name] ?? { icon: '📚', desc: '' }
            const db   = (dbSubjs ?? []).find((d: { id: string; name: string }) => d.name === name)
            return { name, icon: meta.icon, desc: meta.desc, subjectId: db?.id ?? null }
          }))
        }
      } catch { /* ignore */ }
    }

    try {
      const res  = await fetch('/api/v1/video-bookmarks')
      const data = await res.json()
      setBookmarks(data.bookmarks ?? [])
    } catch { /* ignore */ }

    setClassroomLoaded(true)
  }

  const _handleHeartVideo = async (title: string) => {
    if (heartedVideos[title]) return
    setHeartedVideos((prev) => ({ ...prev, [title]: true }))
    fetch('/api/v1/video-bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: '', video_title: title, video_thumbnail: '' }),
    }).catch(() => {})
  }

  const handleVideoTap = async (idx: number) => {
    const vid = videoRefs.current[idx]
    if (!vid) return
    if (vid.paused) {
      // 다른 영상 먼저 일시정지
      videoRefs.current.forEach((v, i) => { if (v && i !== idx) { v.pause() } })
      try {
        await vid.play()
        setPlayingIdx(idx)      // play() 성공 시에만 오버레이 제거
      } catch {
        setPlayingIdx(null)     // 브라우저 정책으로 차단된 경우 상태 유지
      }
    } else {
      vid.pause()
      setPlayingIdx(null)
    }
  }

  const dismissCodePopup = async () => {
    setShowCodePopup(false)
    const userId = session?.user?.id ?? ''
    if (userId) {
      fetch('/api/v1/profile-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code_popup_shown: true }),
      }).catch(() => {})
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
    } catch {
      setCodeError('네트워크 오류가 발생했습니다')
    } finally {
      setCodeSubmitting(false)
    }
  }

  const handleAddDDayGoal = async () => {
    if (!ddayNewDate || savingDDay) return
    setSavingDDay(true)
    try {
      const userId = session?.user?.id ?? ''

      // user-goals 테이블 저장 (기존)
      const res  = await fetch('/api/v1/user-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, cert_type: ddayNewCert, exam_target_date: ddayNewDate }),
      })
      const data = await res.json()
      if (data.goal) setDdayGoals((prev) => [...prev, data.goal])

      // profiles.exam_date + cert_type 저장 → 대시보드 상단 D-Day 즉시 반영
      await fetch('/api/v1/profile-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, exam_target_date: ddayNewDate, cert_type: ddayNewCert }),
      })
      setProfileExamDate(ddayNewDate)
      setProfileCert(ddayNewCert)
      setExamDateInput(ddayNewDate)   // 내 정보 탭도 동기화
      // localStorage 백업 — 재로그인 후 DB 조회 전 즉시 복원용
      localStorage.setItem('kinepia_exam_date', ddayNewDate)
      if (ddayNewCert) localStorage.setItem('kinepia_cert_type', ddayNewCert)

      setDdayNewDate('')
      setShowDDayModal(false)         // 모달 자동 닫힘
    } catch { /* ignore */ }
    setSavingDDay(false)
  }

  const handleDeleteDDayGoal = async (id: string) => {
    const newGoals = ddayGoals.filter((g) => g.id !== id)
    setDdayGoals(newGoals)
    try {
      const userId = session?.user?.id ?? ''
      await fetch('/api/v1/user-goals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, id }),
      })
      // 삭제 후 남은 goal이 없으면 profiles.exam_date도 초기화
      if (newGoals.length === 0) {
        await fetch('/api/v1/profile-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, exam_target_date: null }),
        })
        setProfileExamDate(null)
        setExamDateInput('')
      }
    } catch { /* ignore */ }
  }

  const moveCert = (idx: number, dir: 'up' | 'down') => {
    const next = [...certOrder]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setCertOrder(next)
  }

  const moveSubject = (certId: string, idx: number, dir: 'up' | 'down') => {
    const subjects = [...(subjectOrderByCert[certId] ?? [])]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= subjects.length) return
    ;[subjects[idx], subjects[swap]] = [subjects[swap], subjects[idx]]
    setSubjectOrderByCert((prev) => ({ ...prev, [certId]: subjects }))
  }

  const handleOrderSave = async () => {
    try {
      localStorage.setItem('kinepia_subject_order', JSON.stringify(subjectOrderByCert))
      const updates = certOrder.map((certId, idx) =>
        supabase
          .from('user_certifications')
          .update({ order_index: idx })
          .eq('cert_id', certId)
          .eq('user_id', session?.user?.id ?? '')
      )
      await Promise.all(updates)
      setToastMessage('학습 순서가 저장되었습니다.')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2500)
    } catch {
      setToastMessage('저장에 실패했습니다. 다시 시도해주세요.')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2500)
    }
  }

  const handleSurveySubmit = async () => {
    if (!surveyStars) return
    setSurveyLoading(true)
    try {
      await fetch('/api/v1/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:        session?.user?.id,
          starRating:    surveyStars,
          reviewText:    surveyText,
          surveyAnswers: { q1: surveyQ1, q2: surveyQ2, feedback: surveyFeedback },
          isPublic:      surveyConsent,
        }),
      })
      surveyCompletedRef.current = true
      setSurveyDone(true)
      setTimeout(() => {
        setShowSurveyPopup(false)
        setSurveyDone(false)
      }, 1800)
    } finally {
      setSurveyLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const userId = session?.user?.id ?? ''
      await fetch('/api/v1/profile-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...(examDateInput ? { exam_target_date: examDateInput } : {}),
          cert_type:         certTypeInput    || null,
          region:            regionInput      || null,
          daily_study_hours: dailyHoursInput  ? parseInt(dailyHoursInput) : null,
          daily_study_time:  studyTimeInput   || null,
          daily_study_count: studyCountInput  || null,
          study_time_slot:   studyTimeSlotInput || null,
        }),
      })
      // 홈 D-Day 카드 실시간 반영
      setProfileExamDate(examDateInput || null)
      // localStorage 백업 — 재로그인 후 DB 조회 전 즉시 복원용
      if (examDateInput) localStorage.setItem('kinepia_exam_date', examDateInput)
      else localStorage.removeItem('kinepia_exam_date')
      if (certTypeInput) localStorage.setItem('kinepia_cert_type', certTypeInput)
      if (certTypeInput && certTypeInput !== profileCert) {
        setProfileCert(certTypeInput)
        // certKey / certLabel 동기화
        const newKey = Object.entries(CERT_LABELS).find(([, v]) => v === certTypeInput)?.[0] ?? ''
        if (newKey) { setCertKey(newKey); setCertLabel(certTypeInput) }
      }
    } catch { /* ignore */ }
    setSavingProfile(false)
  }

  // 알림 토글 → 즉시 자동 저장
  const _handleTogglePush = async (value: boolean) => {
    _setPushEnabled(value)
    const userId = session?.user?.id ?? ''
    fetch('/api/v1/profile-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, push_enabled: value }),
    }).catch(() => {})
  }

  const moveCalMonth = (delta: number) => {
    setCalMonth((m) => {
      const newM = m + delta
      if (newM < 1)  { setCalYear((y) => y - 1); return 12 }
      if (newM > 12) { setCalYear((y) => y + 1); return 1 }
      return newM
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // ① HOME TAB
  // ══════════════════════════════════════════════════════════════════
  const renderHome = () => {
    // D-Day 계산 (profileExamDate 기준)
    const examDiff = profileExamDate
      ? Math.ceil((new Date(profileExamDate).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000)
      : null

    // ── 학습 활동 내역 계산 ──────────────────────────────────────────

    // 캘린더: 날짜별 점수 맵
    const actToday = new Date(); actToday.setHours(0, 0, 0, 0)
    const studyMap: Record<string, number[]> = {}
    const hundredMap: { [key: string]: boolean } = {}
    allStats.forEach((s) => {
      if (!s.last_attempt_at) return
      const d = new Date(s.last_attempt_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!studyMap[key]) studyMap[key] = []
      studyMap[key].push(s.avg_score)

      if (s.best_score === 100) {
        const d2 = new Date(s.last_attempt_at)
        const hKey = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')}`
        hundredMap[hKey] = true
      }
    })
    // 그리드: 선택 월 1일~말일, 월요일 시작 패딩 포함
    const firstDay = new Date(calYear, calMonth - 1, 1)
    const lastDay  = new Date(calYear, calMonth, 0)
    const startPad = (firstDay.getDay() + 6) % 7  // Mon=0
    const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7
    const calCells = Array.from({ length: totalCells }, (_, i) => {
      const dayNum = i - startPad + 1
      if (dayNum < 1 || dayNum > lastDay.getDate()) return { empty: true, isFuture: false, isToday: false, studied: false, avgScore: 0 }
      const d = new Date(calYear, calMonth - 1, dayNum)
      const isFuture = d > actToday
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const scores = studyMap[key] ?? []
      return {
        empty: false,
        isFuture,
        isToday: d.getTime() === actToday.getTime(),
        studied: scores.length > 0,
        avgScore: scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        hasHundred: hundredMap[key] ?? false,
      }
    })
    const getCellColor = (cell: typeof calCells[0]) => {
      if (cell.isFuture) return '#FAFAFA'
      if (!cell.studied)  return '#E5E5E5'
      if (cell.avgScore >= 80) return '#00A651'
      if (cell.avgScore >= 60) return '#7DBA5A'
      return '#C4E49A'
    }

    // 주간 요약 (이번 주 7일 vs 지난 주 7일)
    const day7ago  = new Date(actToday); day7ago.setDate(actToday.getDate() - 7)
    const day14ago = new Date(actToday); day14ago.setDate(actToday.getDate() - 14)
    const inRange  = (s: ChapterStat, from: Date, to: Date) => {
      if (!s.last_attempt_at) return false
      const d = new Date(s.last_attempt_at); d.setHours(0, 0, 0, 0)
      return d >= from && d <= to
    }
    const thisWeekStats = allStats.filter((s) => inRange(s, day7ago, actToday))
    const lastWeekStats = allStats.filter((s) => inRange(s, day14ago, new Date(day7ago.getTime() - 1)))
    const thisWeekCount = thisWeekStats.length
    const lastWeekCount = lastWeekStats.length
    const thisWeekAvg   = thisWeekStats.length > 0
      ? Math.round(thisWeekStats.reduce((a, s) => a + s.avg_score, 0) / thisWeekStats.length) : 0
    const lastWeekAvg   = lastWeekStats.length > 0
      ? Math.round(lastWeekStats.reduce((a, s) => a + s.avg_score, 0) / lastWeekStats.length) : 0

    // 취약 과목 (avg_score < 60)
    const subjectScoreMap: Record<string, number[]> = {}
    allStats.forEach((s) => {
      const subj = chapterSubjectMap[s.chapter_id]
      if (!subj) return
      if (!subjectScoreMap[subj]) subjectScoreMap[subj] = []
      subjectScoreMap[subj].push(s.avg_score)
    })
    const weakSubjects = Object.entries(subjectScoreMap)
      .map(([name, scores]) => ({
        name,
        avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      }))
      .filter((s) => s.avg < 60)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 3)

    // 강의실 바로가기: 자격증 진도율 집계
    const displayCert = certLabel || profileCert || ''
    const aggProgress = Object.values(subjectProgress).reduce(
      (acc, p) => ({ total: acc.total + p.total, completed: acc.completed + p.completed }),
      { total: 0, completed: 0 }
    )
    const overallPct = aggProgress.total > 0
      ? Math.round((aggProgress.completed / aggProgress.total) * 100)
      : 0

    return (
    <div className="overflow-y-auto pb-[130px]" style={{ height: 'calc(100dvh - 56px)' }}>

      {/* ── 유저 정보 영역 ──────────────────────────────────────── */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-[#F0F0EE]">
        {/* 아바타 + 이름 */}
        <div className="flex items-center gap-3 mb-4">
          {profileAvatar && !avatarError ? (
            <Image
              src={profileAvatar}
              alt="avatar"
              width={44}
              height={44}
              className="w-11 h-11 rounded-full object-cover flex-shrink-0"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#00A651]/15 flex items-center justify-center text-[18px] flex-shrink-0">
              👤
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-black text-[#1A1A1A] truncate">
              {profileName ?? session?.user?.name ?? '사용자'}
            </p>
            {profileCert && (
              <p className="text-[11px] text-[#ADADAD] mt-0.5 truncate">{profileCert}</p>
            )}
          </div>
        </div>

        {/* D-Day + 스트릭 */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* D-Day 카드 */}
          {examDiff !== null ? (
            <button
              onClick={() => setShowDDayModal(true)}
              className="bg-[#1A1A1A] rounded-2xl px-4 py-3 text-left"
            >
              <p className="text-[10px] text-white/50 font-bold mb-0.5">시험까지</p>
              <p className="text-[30px] font-black text-[#00A651] leading-none">
                {examDiff > 0 ? `D-${examDiff}` : examDiff === 0 ? 'D-Day' : `D+${Math.abs(examDiff)}`}
              </p>
              <p className="text-[13px] font-bold text-[#F5A623] mt-1 truncate">
                {profileCert
                  ? `${new Date(profileExamDate!).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} · ${profileCert}`
                  : new Date(profileExamDate!).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
                }
              </p>
            </button>
          ) : (
            <button
              onClick={() => setShowDDayModal(true)}
              className="bg-[#F5F5F3] border border-dashed border-[#DADADA] rounded-2xl px-4 py-3 text-left"
            >
              <p className="text-[10px] text-[#ADADAD] font-bold mb-0.5">시험까지</p>
              <p className="text-[13px] font-bold text-[#ADADAD]">시험일 설정하기</p>
              <p className="text-[10px] text-[#ADADAD]/60 mt-0.5">탭하여 추가</p>
            </button>
          )}

          {/* 스트릭 카드 */}
          <div className="bg-[#F5F5F3] rounded-2xl px-4 py-3">
            <p className="text-[10px] text-[#ADADAD] font-bold mb-0.5">연속 학습일</p>
            <p className="text-[22px] font-black text-[#1A1A1A] leading-none">
              {streak > 0 ? `🔥 ${streak}일` : '0일'}
            </p>
            <p className="text-[10px] text-[#ADADAD] mt-0.5">
              {streak > 0 ? '오늘도 이어가세요!' : '오늘 학습을 시작하세요'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center mt-6 mb-2 px-4">
        <span className="text-[9px] text-[#ADADAD] mb-1 self-start">광고</span>
        {tab === 'home' && <KakaoAdFit unit="DAN-tyVXseZl4nT47hHT" width={320} height={50} />}
      </div>

      {/* ② Daily 학습/테스트 */}
      <div className="px-4 py-2">
        {studiedToday ? (
          /* 학습 완료 → 테스트 버튼 */
          <button
            onClick={() => router.push('/trainer/dashboard?tab=exam')}
            className="w-full bg-[#1A1A1A] text-white rounded-2xl p-4 flex items-center gap-3 active:opacity-90"
          >
            <span className="text-[24px]">✅</span>
            <div className="text-left flex-1">
              <p className="text-[15px] font-bold">테스트 시작하기</p>
              <p className="text-[11px] text-white/50">오늘 학습 내용을 점검해보세요</p>
            </div>
            <ChevronRight size={18} className="text-white/50" />
          </button>
        ) : todayChapter ? (
          /* ── 오늘의 학습 카드 (3단계 상태 분기) ── */
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: '#00A651' + '1A' }}
              >
                {SUBJECT_META[todayChapter.subjectName]?.icon ?? '📚'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[#1A1A1A] truncate">{todayChapter.title}</p>
                <p className="text-[11px] text-[#ADADAD] truncate">{todayChapter.subjectName}</p>
              </div>
            </div>

            {todayChapterState === 'lesson' && (
              <button
                onClick={() => router.push(`/lesson/${todayChapter.chapterId}`)}
                className="mt-3 flex items-center gap-1 text-[11px] font-bold bg-[#E8F5E9] text-[#2e7d32] px-3 py-1.5 rounded-full"
              >
                ▶ 학습 이어서 하기
              </button>
            )}
            {todayChapterState === 'test_start' && (
              <button
                onClick={() => router.push(`/test/${todayChapter.chapterId}`)}
                className="mt-3 flex items-center gap-1 text-[11px] font-bold bg-[#E3F2FD] text-[#1565c0] px-3 py-1.5 rounded-full"
              >
                ✏️ 챕터 테스트 시작하기
              </button>
            )}
            {todayChapterState === 'test_retry' && (
              <button
                onClick={() => router.push(`/test/${todayChapter.chapterId}`)}
                className="mt-3 flex items-center gap-1 text-[11px] font-bold bg-[#FFF8E1] text-[#e65100] px-3 py-1.5 rounded-full"
              >
                🔄 챕터 테스트 재도전
              </button>
            )}
          </div>
        ) : recentStats.length > 0 ? (
          /* 학습 이력 있음 + 오늘 미학습 → 학습 시작하기 */
          <button
            onClick={() => {
              const first = subjectCards.find((c) => c.subjectId)
              if (first?.subjectId) {
                router.push(`/chapters/${first.subjectId}`)
              } else {
                router.push('/trainer/dashboard?tab=classroom')
              }
            }}
            className="w-full bg-[#1A1A1A] text-white rounded-2xl p-4 flex items-center gap-3 active:opacity-90"
          >
            <span className="text-[24px]">📖</span>
            <div className="text-left flex-1">
              {userCerts[0]?.cert_label && (
                <p className="text-[10px] text-white/40 mb-0.5">{userCerts[0].cert_label}</p>
              )}
              <p className="text-[15px] font-bold">학습 시작하기</p>
              <p className="text-[11px] text-white/50">오늘의 학습을 이어가세요</p>
            </div>
            <ChevronRight size={18} className="text-white/50" />
          </button>
        ) : (
          /* 신규 사용자 */
          <button
            onClick={() => router.push('/trainer/dashboard?tab=classroom')}
            className="w-full bg-[#00A651] text-white rounded-2xl p-4 flex items-center gap-3 active:opacity-90"
          >
            <span className="text-[24px]">📚</span>
            <div className="text-left flex-1">
              {userCerts[0]?.cert_label && (
                <p className="text-[10px] text-white/60 mb-0.5">{userCerts[0].cert_label}</p>
              )}
              <p className="text-[15px] font-bold">학습 시작하기</p>
              <p className="text-[11px] text-white/70">강의실에서 과목을 선택해보세요</p>
            </div>
            <ChevronRight size={18} className="text-white/70" />
          </button>
        )}
      </div>

      {/* ③ 추천 영상 — 중앙 85% + 좌우 peek 캐러셀 */}
      {false && <div className="py-2">
        <p className="text-[12px] font-bold text-[#ADADAD] uppercase tracking-wider px-4 mb-2">
          오늘의 추천 영상
        </p>
        {/*
          scroll-snap-align: start + scrollPaddingLeft: 7.5%
          → 첫 카드는 marginLeft 7.5%로 출발, 이후 카드도 좌측 7.5% 기준으로 스냅
          → 양쪽 peek ≈ 7.5% - 5px(gap/2)
        */}
        <div
          className="flex overflow-x-scroll"
          style={{
            scrollSnapType: 'x mandatory',
            scrollPaddingLeft: '7.5%',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            overscrollBehaviorX: 'contain',
          } as React.CSSProperties}
        >
          {ALL_VIDEOS.slice(0, HOME_VIDEO_COUNT).map((vid, i) => {
            const isFirst = i === 0
            const isLast  = i === HOME_VIDEO_COUNT - 1
            return (
              <div
                key={i}
                className="flex-shrink-0 cursor-pointer"
                style={{
                  width: '85%',
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  marginLeft:  isFirst ? '7.5%' : '10px',
                  marginRight: isLast  ? '7.5%' : 0,
                }}
                onClick={() => handleVideoTap(i)}
              >
                {/* 영상 영역 */}
                <div
                  className="rounded-2xl overflow-hidden bg-[#1A1A1A] relative"
                  style={{ aspectRatio: '9 / 11' }}
                >
                  <video
                    ref={(el) => { videoRefs.current[i] = el }}
                    src={vid.src}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    preload="metadata"
                    loop
                    onLoadedMetadata={(e) => {
                      const v = e.target as HTMLVideoElement
                      v.currentTime = 0.001
                    }}
                  />

                  {/* 정지 오버레이 — 재생 버튼 */}
                  {playingIdx !== i && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-[#00A651] flex items-center justify-center shadow-xl">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                          <polygon points="7,3 21,12 7,21" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* 재생 중 — 녹색 테두리 + 인디케이터 */}
                  {playingIdx === i && (
                    <>
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#00A651] px-2.5 py-1 rounded-full pointer-events-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-white text-[10px] font-bold">재생 중</span>
                      </div>
                      <div className="absolute inset-0 rounded-2xl ring-2 ring-[#00A651] pointer-events-none" />
                    </>
                  )}
                </div>

                {/* 카드 하단 — 제목/설명 */}
                <div className="px-1 pt-2.5 pb-1">
                  <p className="text-[13px] font-bold text-[#1A1A1A] truncate">{vid.title}</p>
                  <p className="text-[11px] text-[#ADADAD] truncate mt-0.5">{vid.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* 더보기 버튼 */}
        <button
          onClick={() => router.push('/videos')}
          className="w-full mt-3 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-[#00A651]"
        >
          더보기 <ChevronRight size={14} />
        </button>
      </div>}

      {/* ④ 강의실 바로가기 — 자격증 카드 */}
      <div className="py-2">
        <p className="text-[12px] font-bold text-[#ADADAD] uppercase tracking-wider px-4 mb-2">
          강의실 바로가기
        </p>
        <div
          className="flex gap-3 overflow-x-auto pb-2"
          style={{
            scrollSnapType: 'x mandatory',
            scrollPaddingLeft: '1rem',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          } as React.CSSProperties}
        >
          {userCerts.length > 0 ? (
            <>
              {/* user_certifications 기반 다중 카드 */}
              {[...userCerts]
                .sort((a, b) => {
                  if (a.last_studied_at && b.last_studied_at)
                    return new Date(b.last_studied_at).getTime() - new Date(a.last_studied_at).getTime()
                  if (a.last_studied_at) return -1
                  if (b.last_studied_at) return 1
                  return a.order_index - b.order_index
                })
                .slice(0, 3)
                .map((uc) => (
                  <button
                    key={uc.id}
                    onClick={() => {
                      const firstSubjName = uc.subjects?.[0]
                      const card = firstSubjName
                        ? subjectCards.find((c) => c.name === firstSubjName)
                        : null
                      if (card?.subjectId) {
                        router.push(`/chapters/${card.subjectId}`)
                      } else {
                        router.push('/trainer/dashboard?tab=classroom')
                      }
                    }}
                    className="flex-shrink-0 bg-[#1A1A1A] rounded-2xl p-4 text-left active:opacity-90"
                    style={{ width: '72%', scrollSnapAlign: 'start', marginLeft: '1rem' }}
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[20px] flex-shrink-0">
                        {CERT_ICONS[uc.cert_label] ?? '🏅'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-black text-white truncate">{uc.cert_label}</p>
                        <p className="text-[11px] text-white/50">
                          {uc.subjects.length > 0 ? `${uc.subjects.length}개 과목` : '과목을 선택해주세요'}
                        </p>
                      </div>
                    </div>
                    {/* 과목 태그 */}
                    {uc.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {uc.subjects.slice(0, 4).map((s) => (
                          <span key={s} className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full truncate max-w-[80px]">
                            {s}
                          </span>
                        ))}
                        {uc.subjects.length > 4 && (
                          <span className="text-[10px] bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
                            +{uc.subjects.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))
              }
              {/* 강의 추가하기 카드 (최대 3개 미만일 때만) */}
              {userCerts.length < 3 && (
                <button
                  onClick={() => { if (!session) { setShowLoginPrompt(true); return }; router.push('/select-cert') }}
                  className="flex-shrink-0 rounded-2xl border-2 border-dashed border-[#E5E5E5] bg-white flex flex-col items-center justify-center gap-2 active:bg-[#F5F5F3]"
                  style={{ width: '44%', scrollSnapAlign: 'start', minHeight: '130px', marginRight: '1rem' }}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#F5F5F3] flex items-center justify-center">
                    <Plus size={20} className="text-[#ADADAD]" />
                  </div>
                  <p className="text-[12px] font-bold text-[#ADADAD]">강의 추가하기</p>
                </button>
              )}
            </>
          ) : (
            <>
              {/* 기존 단일 자격증 카드 (fallback) */}
              {displayCert ? (
                <button
                  onClick={() => router.push('/trainer/dashboard?tab=classroom')}
                  className="flex-shrink-0 bg-[#1A1A1A] rounded-2xl p-4 text-left active:opacity-90"
                  style={{ width: '75%', scrollSnapAlign: 'start', marginLeft: '1rem' }}
                >
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[20px] flex-shrink-0">
                      {CERT_ICONS[displayCert] ?? '🏅'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-black text-white truncate">{displayCert}</p>
                      <p className="text-[11px] text-white/50">
                        {subjects.length > 0 ? `${subjects.length}개 과목 수강 중` : '과목을 선택해주세요'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[11px] text-white/40">전체 진도율</span>
                      <span className="text-[18px] font-black text-[#00A651] leading-none">{overallPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#00A651] rounded-full transition-all" style={{ width: `${overallPct}%` }} />
                    </div>
                    {aggProgress.total > 0 && (
                      <p className="text-[10px] text-white/30 mt-1.5">
                        {aggProgress.completed} / {aggProgress.total} 챕터 완료
                      </p>
                    )}
                  </div>
                </button>
              ) : null}
              {/* 자격증 추가하기 카드 */}
              <button
                onClick={() => { if (!session) { setShowLoginPrompt(true); return }; router.push('/select-cert') }}
                className="flex-shrink-0 rounded-2xl border-2 border-dashed border-[#E5E5E5] bg-white flex flex-col items-center justify-center gap-2 active:bg-[#F5F5F3]"
                style={{
                  width: displayCert ? '44%' : '75%',
                  scrollSnapAlign: 'start',
                  minHeight: '130px',
                  marginLeft: displayCert ? 0 : '1rem',
                  marginRight: '1rem',
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-[#F5F5F3] flex items-center justify-center">
                  <Plus size={20} className="text-[#ADADAD]" />
                </div>
                <p className="text-[12px] font-bold text-[#ADADAD]">자격증 추가하기</p>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ⑤ 내 학습 활동 내역 */}
      <div className="px-4 py-2 space-y-3 pb-4">
        <p className="text-[12px] font-bold text-[#ADADAD] uppercase tracking-wider">내 학습 활동 내역</p>

        {/* 1. 학습 캘린더 (잔디밭) */}
        <div
          className="bg-white rounded-2xl border border-[#E5E5E5] p-4"
          onTouchStart={(e) => { calTouchStartX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            if (calTouchStartX.current === null) return
            const dx = e.changedTouches[0].clientX - calTouchStartX.current
            calTouchStartX.current = null
            if (dx > 50)  moveCalMonth(-1)  // 오른쪽 스와이프 → 이전 달
            else if (dx < -50) moveCalMonth(1)  // 왼쪽 스와이프 → 다음 달
          }}
        >
          {/* 월 이동 헤더 */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => moveCalMonth(-1)}
                className="w-6 h-6 flex items-center justify-center text-[#ADADAD] hover:text-[#1A1A1A] text-[14px] font-bold"
              >◀</button>
              <p className="text-[15px] font-black text-[#1A1A1A]">
                {calYear}년 {calMonth}월
              </p>
              <button
                onClick={() => moveCalMonth(1)}
                className="w-6 h-6 flex items-center justify-center text-[#ADADAD] hover:text-[#1A1A1A] text-[14px] font-bold"
              >▶</button>
            </div>
            <p className="text-[11px] text-[#ADADAD]">
              {streak > 0 ? `🔥 ${streak}일 연속` : '오늘 학습해보세요'}
            </p>
          </div>
          <p className="text-[11px] text-[#ADADAD] mb-3">🌱 학습 캘린더</p>
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-[3px] mb-1">
            {['월', '화', '수', '목', '금', '토', '일'].map((d) => (
              <div key={d} className="text-center text-[9px] font-bold text-[#ADADAD]">{d}</div>
            ))}
          </div>
          {/* 잔디밭 그리드 */}
          <div className="grid grid-cols-7 gap-[3px]">
            {calCells.map((cell, i) => (
              <div
                key={i}
                className={`aspect-square rounded-[3px] ${cell.empty ? '' : cell.isToday ? 'ring-[1.5px] ring-[#1A1A1A] ring-offset-0' : cell.hasHundred ? 'ring-[1.5px] ring-[#FFD54F] ring-offset-0' : ''}`}
                style={{ backgroundColor: cell.empty ? 'transparent' : getCellColor(cell) }}
              />
            ))}
          </div>
          {/* 범례 */}
          <div className="flex items-center gap-3 mt-2.5 justify-end">
            {([
              { color: '#E5E5E5', label: '없음' },
              { color: '#C4E49A', label: '~59점' },
              { color: '#7DBA5A', label: '60~79' },
              { color: '#00A651', label: '80점↑' },
            ] as const).map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-[9px] text-[#ADADAD]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. 주간 요약 */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* 이번 주 */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-3.5">
            <p className="text-[10px] font-bold text-[#ADADAD] mb-2">이번 주</p>
            <p className="text-[24px] font-black text-[#1A1A1A] leading-none">{thisWeekCount}
              <span className="text-[12px] font-semibold text-[#ADADAD] ml-1">챕터</span>
            </p>
            {thisWeekAvg > 0 && (
              <p className="text-[12px] font-bold text-[#00A651] mt-1.5">평균 {thisWeekAvg}점</p>
            )}
            {allStats.length > 0 && lastWeekCount > 0 && (
              <p className={`text-[10px] mt-1 font-semibold ${
                thisWeekCount >= lastWeekCount ? 'text-[#00A651]' : 'text-[#E24B4A]'
              }`}>
                {thisWeekCount >= lastWeekCount ? '↑' : '↓'} {Math.abs(thisWeekCount - lastWeekCount)}챕터
              </p>
            )}
          </div>
          {/* 지난 주 */}
          <div className="bg-[#F5F5F3] rounded-2xl border border-[#E5E5E5] p-3.5">
            <p className="text-[10px] font-bold text-[#ADADAD] mb-2">지난 주</p>
            <p className="text-[24px] font-black text-[#1A1A1A] leading-none">{lastWeekCount}
              <span className="text-[12px] font-semibold text-[#ADADAD] ml-1">챕터</span>
            </p>
            {lastWeekAvg > 0 && (
              <p className="text-[12px] font-semibold text-[#ADADAD] mt-1.5">평균 {lastWeekAvg}점</p>
            )}
          </div>
        </div>

        {/* 3. 취약 과목 알림 */}
        {allStats.length === 0 ? (
          <div className="text-[12px] text-[#ADADAD] text-center py-4">
            아직 학습 기록이 없어요.<br/>
            학습을 시작하면 활동 내역이 표시됩니다.
          </div>
        ) : weakSubjects.length === 0 ? (
          <div className="text-[12px] text-[#ADADAD] text-center py-4">
            아직 테스트 데이터가 없어요.<br/>
            챕터 테스트를 완료하면 취약 과목이 표시됩니다.
          </div>
        ) : (
          <div className="bg-[#FFF8F0] rounded-2xl border border-[#F5A623]/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[15px]">⚠️</span>
              <p className="text-[13px] font-bold text-[#1A1A1A]">집중 학습이 필요한 과목</p>
            </div>
            <div className="space-y-2.5">
              {weakSubjects.map(({ name, avg }) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[14px] flex-shrink-0">{SUBJECT_META[name]?.icon ?? '📚'}</span>
                    <span className="text-[13px] font-semibold text-[#1A1A1A] truncate">{name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <div className="w-16 h-1.5 bg-[#F0E8DC] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#F5A623] rounded-full"
                        style={{ width: `${avg}%` }}
                      />
                    </div>
                    <span className="text-[12px] font-black text-[#F5A623] w-8 text-right">{avg}점</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[#ADADAD] mt-3 leading-relaxed">
              정답률 60% 미만 — 해당 과목 챕터를 다시 학습해보세요
            </p>
          </div>
        )}
      </div>
    </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // ② CLASSROOM TAB
  // ══════════════════════════════════════════════════════════════════
  const renderClassroom = () => {
    const fallbackRequired = certKey === 'exercise-prescriptionist'
      ? healthCertSubjects.map((s) => s.name)
      : (REQUIRED_SUBJECTS[certKey] ?? [])
    const effectiveRequired = dbRequiredNames.length > 0 ? dbRequiredNames : fallbackRequired
    const requiredList   = subjects.filter((s) => effectiveRequired.includes(s))
    const optionalList   = subjects.filter((s) => !effectiveRequired.includes(s))
    const showTypeLabels = effectiveRequired.length > 0

    const SubjectRow = ({
      name,
      hasBorder,
    }: {
      name: string
      hasBorder: boolean
    }) => {
      const card     = subjectCards.find((c) => c.name === name)
      const meta     = SUBJECT_META[name] ?? { icon: '📚', desc: '' }
      const progress = subjectProgress[name]
      const pct      = progress && progress.total > 0
        ? Math.round((progress.completed / progress.total) * 100)
        : 0
      return (
        <button
          onClick={() => {
            if (card?.subjectId) {
              localStorage.setItem('kinepia_current_subject_id', card.subjectId)
              router.push(`/chapters/${card.subjectId}`)
            }
          }}
          disabled={!card?.subjectId}
          className={`w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-[#F5F5F3] disabled:opacity-60 ${hasBorder ? 'border-b border-[#F0F0EE]' : ''}`}
        >
          <div className="w-9 h-9 rounded-xl bg-[#F5F5F3] flex items-center justify-center text-[18px] flex-shrink-0">
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#1A1A1A] truncate">{name}</p>
            <div className="flex items-center gap-2 mt-1">
              {progress !== undefined ? (
                <>
                  <div className="flex-1 h-1.5 bg-[#F0F0EE] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00A651] rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#ADADAD] flex-shrink-0 font-semibold">{pct}%</span>
                </>
              ) : (
                <span className="text-[10px] text-[#ADADAD]">학습 시작 전</span>
              )}
            </div>
          </div>
          {card?.subjectId
            ? <ChevronRight size={14} className="text-[#ADADAD] flex-shrink-0" />
            : <span className="text-[10px] text-[#ADADAD] flex-shrink-0">준비중</span>
          }
        </button>
      )
    }

    return (
      <div className="overflow-y-auto p-4 pb-[130px] space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>

        <div className="pt-8">
          <h2 className="text-[20px] font-black text-[#1A1A1A]">강의실</h2>
        </div>

        {userCerts.length > 0 ? (
          /* ── user_certifications 기반 다중 카드 ── */
          <>
            {userCerts
              .slice()
              .sort((a, b) => a.order_index - b.order_index)
              .map((uc) => (
                <div key={uc.id} className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
                  <div className="flex items-center pr-3 overflow-hidden">
                    <button
                      onClick={() => {
                        if (!session) { setShowLoginPrompt(true); return }
                        setExpandedCertId((prev) => prev === uc.id ? null : uc.id)
                      }}
                      className="flex-1 px-4 py-4 flex items-center gap-3 text-left active:bg-[#F5F5F3]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[20px] flex-shrink-0">
                        {CERT_ICONS[uc.cert_label] ?? '🏅'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <MarqueeText
                          text={uc.cert_label}
                          className="text-[15px] font-black text-[#1A1A1A] whitespace-nowrap"
                        />
                        <p className="text-[11px] text-[#ADADAD]">
                          {uc.cert_id === 'sports-instructor-2-practical' ? '보디빌딩' : uc.subjects.length > 0 ? `${uc.subjects.length}개 과목 수강 중` : '과목을 선택해주세요'}
                        </p>
                      </div>
                      <div className={`transition-transform duration-200 flex-shrink-0 ${expandedCertId === uc.id ? 'rotate-90' : ''}`}>
                        <ChevronRight size={16} className="text-[#ADADAD]" />
                      </div>
                    </button>
                    {/* 제거 버튼 */}
                    <button
                      onClick={async () => {
                        const userId = session?.user?.id ?? ''
                        if (!userId) return
                        try {
                          await fetch('/api/v1/user-certifications', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId, certId: uc.id }),
                          })
                          setExpandedCertId(null)
                          await loadClassroom()
                        } catch { /* ignore */ }
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#FFF0F0] flex-shrink-0"
                    >
                      <X size={14} className="text-[#E24B4A]" />
                    </button>
                  </div>

                  {expandedCertId === uc.id && (
                    <div className="border-t border-[#F0F0EE]">
                      {uc.cert_id === 'sports-instructor-2-practical' ? (
                        /* ── 구술/실기 보디빌딩: 고정 9개 과목 → oral-exam 이동 ── */
                        Object.entries(BODYBUILD_COURSES).map(([subjectName, _courseId], idx) => (
                          <button
                            key={subjectName}
                            onClick={() => {
                              const subjectId = BODYBUILD_SUBJECTS[subjectName] ?? ''
                              const courseId  = BODYBUILD_COURSES[subjectName]  ?? ''
                              localStorage.setItem('kinepia_current_subject_id', subjectId)
                              router.push(`/chapters/${subjectId}?courseId=${courseId}`)
                            }}
                            className={`w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-[#F5F5F3] ${idx < Object.keys(BODYBUILD_COURSES).length - 1 ? 'border-b border-[#F0F0EE]' : ''}`}
                          >
                            <div className="w-9 h-9 rounded-xl bg-[#F5F5F3] flex items-center justify-center text-[18px] flex-shrink-0">
                              {SUBJECT_META[subjectName]?.icon ?? '📚'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold text-[#1A1A1A] truncate">{subjectName}</p>
                              {(() => {
                                const ss = subjectStarStats[subjectName]
                                if (ss && (ss.fire > 0 || ss.star > 0)) {
                                  return (
                                    <div className="flex gap-1 mt-0.5 flex-wrap">
                                      {ss.fire > 0 && (
                                        <span className="bg-[#FAECE7] text-[#993C1D] text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                                          🔥 필수 {ss.fire}
                                        </span>
                                      )}
                                      {ss.star > 0 && (
                                        <span className="bg-[#FAEEDA] text-[#854F0B] text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                                          ⭐ 단골 {ss.star}
                                        </span>
                                      )}
                                    </div>
                                  )
                                }
                                return <p className="text-[10px] text-[#ADADAD] mt-0.5">챕터 학습</p>
                              })()}
                            </div>
                            <ChevronRight size={14} className="text-[#ADADAD] flex-shrink-0" />
                          </button>
                        ))
                      ) : uc.subjects.length > 0 ? (
                        /* ── 일반 자격증: subjects 배열 표시 ── */
                        uc.subjects.map((name, idx) => (
                          <SubjectRow
                            key={name}
                            name={name}
                            hasBorder={idx < uc.subjects.length - 1}
                          />
                        ))
                      ) : null}
                    </div>
                  )}
                </div>
              ))
            }

            <div className="flex flex-col items-center mt-6 mb-2 px-4">
              <span className="text-[9px] text-[#ADADAD] mb-1 self-start">광고</span>
              {tab === 'classroom' && <KakaoAdFit unit="DAN-LTearBRyYBpdjEd9" width={320} height={100} />}
            </div>

            {/* 강의 추가하기 버튼 (최대 3개 미만일 때만) */}
            {userCerts.length < 3 && (
              <button
                onClick={() => { if (!session) { setShowLoginPrompt(true); return }; router.push('/select-cert') }}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-[#E5E5E5] text-[13px] text-[#ADADAD]"
              >
                <Plus size={16} /> 강의 추가하기
              </button>
            )}
          </>
        ) : subjects.length === 0 ? (
          /* ── 빈 상태 ── */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-[56px] mb-4">📚</div>
            <p className="text-[16px] font-black text-[#1A1A1A] mb-2">학습할 자격증을 선택해주세요</p>
            <p className="text-[13px] text-[#ADADAD] mb-6">자격증과 과목을 선택하면<br />맞춤 강의가 제공됩니다</p>
            <button
              onClick={() => { if (!session) { setShowLoginPrompt(true); return }; router.push('/select-cert') }}
              className="flex items-center gap-2 px-6 py-3.5 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold"
            >
              <Plus size={18} /> 강의 추가하기
            </button>
          </div>
        ) : (
          /* ── 단일 자격증 카드 + 드롭다운 (기존 fallback) ── */
          <>
            <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
              <button
                onClick={() => setExpandedCertId((prev) => prev === 'fallback' ? null : 'fallback')}
                className="w-full px-4 py-4 flex items-center gap-3 text-left active:bg-[#F5F5F3]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[20px] flex-shrink-0">
                  🏅
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-black text-[#1A1A1A] truncate">
                    {certLabel || profileCert || '내 자격증'}
                  </p>
                  <p className="text-[11px] text-[#ADADAD]">
                    {subjects.length}개 과목 수강 중
                  </p>
                </div>
                <div className={`transition-transform duration-200 ${expandedCertId === 'fallback' ? 'rotate-90' : ''}`}>
                  <ChevronRight size={16} className="text-[#ADADAD]" />
                </div>
              </button>

              {expandedCertId === 'fallback' && (
                <div className="border-t border-[#F0F0EE]">
                  {showTypeLabels ? (
                    <>
                      {requiredList.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-[#F5F5F3] flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider">필수과목</span>
                            <span className="text-[10px] text-[#ADADAD]">· {requiredList.length}개</span>
                          </div>
                          {requiredList.map((name, idx) => (
                            <SubjectRow key={name} name={name} hasBorder={idx < requiredList.length - 1 || optionalList.length > 0} />
                          ))}
                        </div>
                      )}
                      {optionalList.length > 0 && (
                        <div>
                          <div className={`px-4 py-2 bg-[#F5F5F3] flex items-center gap-1.5 ${requiredList.length > 0 ? 'border-t border-[#F0F0EE]' : ''}`}>
                            <span className="text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider">선택과목</span>
                            <span className="text-[10px] text-[#ADADAD]">· {optionalList.length}개</span>
                          </div>
                          {optionalList.map((name, idx) => (
                            <SubjectRow key={name} name={name} hasBorder={idx < optionalList.length - 1} />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    subjects.map((name, idx) => (
                      <SubjectRow key={name} name={name} hasBorder={idx < subjects.length - 1} />
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => { if (!session) { setShowLoginPrompt(true); return }; router.push('/select-cert') }}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-[#E5E5E5] text-[13px] text-[#ADADAD]"
            >
              <Plus size={16} /> 강의 추가하기
            </button>
          </>
        )}

        {/* 찜한 영상 */}
        {bookmarks.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">찜한 영상</p>
            <div className="space-y-2">
              {bookmarks.map((bm) => (
                <div key={bm.id} className="bg-white rounded-xl border border-[#E5E5E5] p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#00A651]/10 flex items-center justify-center text-[18px]">🎬</div>
                  <p className="flex-1 text-[13px] font-semibold text-[#1A1A1A] truncate">{bm.video_title || '저장된 영상'}</p>
                  <Heart size={15} className="text-[#E24B4A] fill-[#E24B4A] flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════
  // ③ EXAM TAB
  // ══════════════════════════════════════════════════════════════════
  const EXAM_DATES = [
    { round: 1, date: '5월 2일 (토)',  dateValue: '2026-05-02' },
    { round: 2, date: '5월 9일 (토)',  dateValue: '2026-05-09' },
    { round: 3, date: '5월 16일 (토)', dateValue: '2026-05-16' },
    { round: 4, date: '5월 23일 (토)', dateValue: '2026-05-23' },
    { round: 5, date: '5월 30일 (토)', dateValue: '2026-05-30' },
    { round: 6, date: '6월 6일 (토)',  dateValue: '2026-06-06' },
    { round: 7, date: '6월 10일 (수)', dateValue: '2026-06-10' },
    { round: 8, date: '6월 11일 (목)', dateValue: '2026-06-11' },
    { round: 9, date: '6월 12일 (금)', dateValue: '2026-06-12' },
  ]
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 가장 가까운 미래 일정 (지나지 않은 것 중 첫 번째)
  const nextExam = EXAM_DATES.find((e) => new Date(e.dateValue) >= today) ?? null
  // 6월 6일 이후면 응원 메시지 표시 (마지막 모의고사 종료 기준)
  const allExamsDone = new Date('2026-06-06') < today

  const calcDDay = (dateValue: string) => {
    const target = new Date(dateValue)
    target.setHours(0, 0, 0, 0)
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'D-Day'
    if (diff > 0) return `D-${diff}`
    return '종료'
  }

  // Admin 여부
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email ?? '')
  if (process.env.NODE_ENV === 'development') {
    console.log('[admin check]', session?.user?.email, isAdmin)
  }

  // 히어로 카드 버튼 상태 계산
  const nowForExam       = new Date()
  const isNextExamToday  = nextExam !== null && new Date(nextExam.dateValue).getTime() === today.getTime()
  const nowH = nowForExam.getHours(), nowM = nowForExam.getMinutes()
  const isEntryClosed    = isNextExamToday && (nowH > 10 || (nowH === 10 && nowM > 0))

  const renderExam = () => {
    /* ── 1뎁스: 자격증 선택 ── */
    if (selectedExamCert === null) {
      return (
        <div className="overflow-y-auto p-4 pb-24 space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>
          <div className="pt-8 pb-2">
            <h2 className="text-[20px] font-black text-[#1A1A1A]">모의고사</h2>
            <p className="text-[13px] text-[#ADADAD] mt-1">자격증을 선택하세요</p>
          </div>
          {userCerts.length > 0 ? (
            <>
              <div className="space-y-3">
                {userCerts.map((uc) => (
                  <button
                    key={uc.id}
                    onClick={() => {
                      if (!session) { setShowLoginPrompt(true); return }
                      setSelectedExamCert(uc.cert_id)
                    }}
                    className="w-full bg-white rounded-2xl border border-[#E5E5E5] px-4 py-4 flex items-center gap-3 text-left active:bg-[#F5F5F3]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[20px] flex-shrink-0">
                      {CERT_ICONS[uc.cert_label] ?? '🎯'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-black text-[#1A1A1A] truncate">{uc.cert_label}</p>
                      <p className="text-[11px] text-[#ADADAD]">
                        {uc.cert_id === 'sports-instructor-2-practical' ? '구술모의고사 · 보디빌딩' : '필기 · 8과목 × 20문항'}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-[#ADADAD] flex-shrink-0" />
                  </button>
                ))}
              </div>
              <div className="flex flex-col items-center mt-6 mb-2 px-4">
                <span className="text-[9px] text-[#ADADAD] mb-1 self-start">광고</span>
                {tab === 'exam' && <KakaoAdFit unit="DAN-LTearBRyYBpdjEd9" width={320} height={100} />}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 text-center">
              <p className="text-[14px] text-[#ADADAD]">강의실에서 자격증을 추가하면 모의고사를 이용할 수 있어요</p>
            </div>
          )}
        </div>
      )
    }

    /* ── 2뎁스: 구술 모의고사 ── */
    if (selectedExamCert === 'sports-instructor-2-practical') {
      const todayStr = new Date().toISOString().split('T')[0]

      const getOralWeeks = () => {
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const examDate = new Date('2026-06-16')

        const dayOfWeek = now.getDay()
        const monday = new Date(now)
        monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

        const weeks: {
          weekNum: number; label: string; range: string
          dates: string[]; isCurrent: boolean; isPast: boolean
        }[] = []

        for (const w of [0, 1, 2, -1]) {
          const weekStart = new Date(monday)
          weekStart.setDate(monday.getDate() + w * 7)
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)

          if (weekStart > examDate) continue

          const dates = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart)
            d.setDate(weekStart.getDate() + i)
            return d.toISOString().split('T')[0]
          })

          const diffDays = Math.ceil((examDate.getTime() - weekStart.getTime()) / 86400000)
          const weekNum = Math.ceil(diffDays / 7)

          const startM = weekStart.getMonth() + 1
          const startD = weekStart.getDate()
          const endM   = weekEnd.getMonth() + 1
          const endD   = weekEnd.getDate()
          const dateRange = `${startM}/${startD} - ${endM}/${endD}`
          const label =
            w === 0  ? `${dateRange} (이번 주)` :
            w === 1  ? `${dateRange} (다음 주)` :
            w === -1 ? `${dateRange} (지난 주)` :
                       dateRange

          const weekEndStr = weekEnd.toISOString().split('T')[0]
          weeks.push({
            weekNum,
            label,
            range: dateRange,
            dates,
            isCurrent: w === 0,
            isPast: weekEndStr < todayStr,
          })
        }
        return weeks
      }

      const oralWeeks = getOralWeeks()

      return (
        <div className="overflow-y-auto p-4 pb-24 space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>
          {/* 헤더 */}
          <div className="pt-8 pb-2 flex items-center gap-3">
            <button
              onClick={() => setSelectedExamCert(null)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#F5F5F3] text-[#1A1A1A] text-[18px]"
            >
              ←
            </button>
            <div>
              <p className="text-[11px] text-[#ADADAD] mb-0.5">2급 생활스포츠지도사</p>
              <h2 className="text-[20px] font-black text-[#1A1A1A]">구술 모의고사</h2>
              <p className="text-[13px] text-[#ADADAD] mt-0.5">주당 2회 · 날짜 자유 선택</p>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => router.push('/oral-exam/b28e78c8-8443-4013-bfef-dbe655c72994')}
              className="w-full py-3 mb-3 border-2 border-dashed border-[#00A651] rounded-2xl text-[14px] font-bold text-[#00A651]"
            >
              🔍 관리자 체험하기
            </button>
          )}

          {oralLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* 모의고사 체험하기 카드 */}
              <div className="mb-4 bg-white border border-[#00A651] rounded-2xl flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-[13px] font-bold text-[#1A1A1A]">모의고사 체험하기</p>
                  <p className="text-[11px] text-[#ADADAD]">랜덤 2문항 · 등록 없이 무료</p>
                </div>
                <button
                  onClick={() => router.push('/oral-exam/b28e78c8-8443-4013-bfef-dbe655c72994?preview=true')}
                  className="px-4 py-2 rounded-xl text-[12px] font-bold bg-[#00A651] text-white"
                >
                  시작
                </button>
              </div>

              {oralWeeks.map((week) => (
                <div key={week.weekNum} className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
                  {/* 주차 헤더 */}
                  <div className={`px-4 py-3 flex items-center justify-between ${week.isCurrent ? 'bg-[#1A1A1A]' : 'bg-[#F5F5F3]'}`}>
                    <span className={`text-[14px] font-black ${week.isCurrent ? 'text-white' : 'text-[#1A1A1A]'}`}>
                      {week.label}
                    </span>
                  </div>

                  {/* 슬롯 2개 */}
                  <div className="divide-y divide-[#F0F0EE]">
                    {([1, 2] as const).map((slot) => {
                      const reg = oralRegs.find(
                        (r) => r.week_number === week.weekNum && r.slot_number === slot
                      )
                      const isToday = reg?.exam_date === todayStr

                      let slotButton: JSX.Element

                      if (week.isPast && reg?.is_completed) {
                        // 1. 지난 주 + 완료
                        slotButton = (
                          <button
                            disabled
                            className="px-4 py-2 rounded-xl text-[12px] font-bold bg-[#00A651]/10 text-[#00A651]"
                          >
                            완료 ✓
                          </button>
                        )
                      } else if (week.isPast) {
                        // 2. 지난 주 (reg 유무 무관)
                        slotButton = (
                          <button
                            disabled
                            className="px-4 py-2 rounded-xl text-[12px] font-bold bg-[#F5F5F3] text-[#ADADAD]"
                          >
                            기간 종료
                          </button>
                        )
                      } else if (reg && isToday) {
                        // 3. 오늘 시험 당일
                        const [h, m] = reg.start_time.split(':').map(Number)
                        const startMin = h * 60 + m
                        const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
                        const isExamOver = nowMin >= startMin + 10
                        slotButton = isExamOver ? (
                          <button
                            disabled
                            className="px-4 py-2 rounded-xl text-[12px] font-bold text-[#ADADAD] bg-[#F5F5F3]"
                          >
                            시험 종료
                          </button>
                        ) : (
                          <button
                            className="px-4 py-2 rounded-xl text-[12px] font-bold bg-[#00A651] text-white active:opacity-80"
                            onClick={() => {
                              if (isAdmin || (nowMin >= startMin && nowMin < startMin + 10)) {
                                router.push('/oral-exam/b28e78c8-8443-4013-bfef-dbe655c72994')
                              } else {
                                setShowOralTimeError(true)
                              }
                            }}
                          >
                            시작하기
                          </button>
                        )
                      } else if (reg && !isToday) {
                        // 4. 신청 완료 (오늘 아님)
                        slotButton = (
                          <button
                            className="px-4 py-2 rounded-xl text-[12px] font-bold border-2 border-[#00A651] bg-[#00A651]/10 text-[#00A651]"
                            onClick={() => setShowOralTicket(reg)}
                          >
                            신청 완료
                          </button>
                        )
                      } else {
                        // 5. 미신청
                        slotButton = (
                          <button
                            className="px-4 py-2 rounded-xl text-[12px] font-bold border-2 border-[#F5A623] text-[#F5A623] bg-transparent active:opacity-80"
                            onClick={() => {
                              setOralPickerTarget({ weekNum: week.weekNum, slot, weekDates: week.dates })
                              setShowOralDatePicker(true)
                            }}
                          >
                            신청하기
                          </button>
                        )
                      }

                      return (
                        <div key={slot} className="px-4 py-3.5 flex items-center justify-between">
                          <div>
                            <p className="text-[13px] font-bold text-[#1A1A1A]">{slot}회차</p>
                            {reg ? (
                              <p className="text-[11px] text-[#ADADAD] mt-0.5">
                                {reg.exam_date} · #{reg.ticket_number}번
                              </p>
                            ) : (
                              <p className="text-[11px] text-[#ADADAD] mt-0.5">날짜 미정</p>
                            )}
                          </div>
                          {slotButton}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    /* ── 2뎁스: 필기 모의고사 (기존 로직 유지) ── */
    const selectedCertLabel = userCerts.find((c) => c.cert_id === selectedExamCert)?.cert_label ?? ''

    return (
      <div className="overflow-y-auto p-4 pb-24 space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>
        <div className="pt-8 pb-2 flex items-center gap-3">
          <button
            onClick={() => setSelectedExamCert(null)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#F5F5F3] text-[#1A1A1A] text-[18px]"
          >
            ←
          </button>
          <div>
            <h2 className="text-[20px] font-black text-[#1A1A1A]">{selectedCertLabel}</h2>
            <p className="text-[13px] text-[#ADADAD] mt-0.5">필기 모의고사</p>
          </div>
        </div>

        <div>
          <p className="text-[12px] text-[#ADADAD]">시험 준비</p>
          <h2 className="text-[18px] font-black text-[#1A1A1A]">2026년 건강운동관리사 모의고사</h2>
        </div>

        {/* 히어로 카드 */}
        {allExamsDone ? (
          /* 모든 모의고사 종료 → 응원 메시지 */
          <div className="bg-[#1A1A1A] rounded-2xl p-5 text-white text-center">
            <div className="text-[36px] mb-2">💪</div>
            <p className="text-[16px] font-black text-white leading-snug">
              곧 시험입니다, 끝까지 힘내세요
            </p>
            <p className="text-[13px] text-white/70 mt-2 leading-relaxed">
              지금까지 준비한 실력을 믿으세요
            </p>
          </div>
        ) : nextExam ? (
          <div className="bg-[#1A1A1A] rounded-2xl p-5 text-white">
            <p className="text-[13px] text-white/50 font-bold tracking-wider mb-2">
              {nextExam.round}회차 모의고사
            </p>
            <div className="text-[43px] font-black text-[#00A651] leading-none">{nextExam.date}</div>
            <div className="text-[43px] font-black text-white leading-none mt-0.5">10:00</div>
            {!registeredRounds.includes(nextExam.round) ? (
              /* 미신청 → 오렌지 아웃라인 */
              <button
                onClick={() => {
                  if (!_accessCodeUsed) { setShowCodePopup(true); return }
                  setExamRound(nextExam.round); setShowSubjectConfirmModal(true)
                }}
                className="mt-4 w-full py-3 rounded-xl text-[14px] font-bold text-[#F5A623] border-2 border-[#F5A623] bg-transparent"
              >
                신청하기
              </button>
            ) : isEntryClosed ? (
              /* 당일 10:01 이후 → 회색 비활성 */
              <button
                onClick={() => setShowExamClosedModal(true)}
                className="mt-4 w-full py-3 rounded-xl text-[14px] font-bold text-[#ADADAD] bg-[#F5F5F3]"
              >
                입장 마감
              </button>
            ) : isNextExamToday ? (
              /* 당일 → 입장하기 버튼 (시간 체크) */
              <button
                onClick={() => {
                  const nowMin  = new Date().getHours() * 60 + new Date().getMinutes()
                  const openMin  = 9 * 60 + 50
                  const closeMin = 10 * 60 + 1
                  if (isAdmin) { router.push('/exam') }
                  else if (nowMin < openMin) { setShowExamNotYetModal(true) }
                  else if (nowMin <= closeMin) { router.push('/exam') }
                  else { setShowExamClosedModal(true) }
                }}
                className="mt-4 w-full py-3 bg-[#00A651] rounded-xl text-[14px] font-bold text-white"
              >
                입장하기
              </button>
            ) : (
              /* 신청 완료 + 당일 아님 → 초록 아웃라인 */
              <div className="mt-4 w-full py-3 rounded-xl text-[14px] font-bold text-center border-2 border-[#00A651] bg-[#00A651]/10 text-[#00A651]">
                신청 완료
              </div>
            )}
            {/* 모의고사 방법 버튼 */}
            <button
              onClick={() => setShowExamInfoModal(true)}
              className="mt-2 w-full py-2 text-[12px] text-white/50 hover:text-white/80"
            >
              모의고사 방법 ▾
            </button>
          </div>
        ) : null}

        {/* 체험하기 카드 */}
        <div className="bg-white rounded-2xl border-2 border-[#00A651] p-4 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-black text-[#1A1A1A]">모의고사 체험하기</p>
            <p className="text-[11px] text-[#6B6B6B] mt-0.5">8과목×5문항 · 40분 · 무료</p>
          </div>
          <button
            onClick={() => router.push('/exam')}
            className="px-4 py-2 bg-[#00A651] rounded-xl text-[13px] font-bold text-white"
          >
            시작
          </button>
        </div>

        {/* 일정 목록 */}
        <div>
          <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">
            <Calendar size={11} className="inline mr-1" />전체 일정
          </p>
          <div className="space-y-2">
            {[...EXAM_DATES].sort((a, b) => {
  const aPast = new Date(a.dateValue) < today
  const bPast = new Date(b.dateValue) < today
  if (aPast && !bPast) return 1
  if (!aPast && bPast) return -1
  return a.round - b.round
}).map((e) => {
              const isNext  = nextExam?.round === e.round
              const isPast  = new Date(e.dateValue) < today
              const isToday = new Date(e.dateValue).getTime() === today.getTime()
              const dday    = calcDDay(e.dateValue)
              return (
                <div key={e.round} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                  isToday ? 'border-[#00A651] bg-white'
                  : isPast ? 'border-[#E5E5E5] bg-[#F5F5F3]'
                  : 'border-[#E5E5E5] bg-white'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black ${
                      isNext  ? 'bg-[#00A651] text-white'
                      : isPast ? 'bg-[#E5E5E5] text-[#ADADAD]'
                      : 'bg-[#F5F5F3] text-[#ADADAD]'
                    }`}>{e.round}</div>
                    <div>
                      <p className={`text-[13px] font-bold ${
                        isNext ? 'text-[#00A651]' : isPast ? 'text-[#ADADAD]' : 'text-[#1A1A1A]'
                      }`}>{e.date}</p>
                      <p className="text-[10px] text-[#ADADAD]">{e.round}회차</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isPast && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isNext ? 'text-[#00A651] bg-[#00A651]/10' : 'text-[#ADADAD] bg-[#F5F5F3]'
                      }`}>{dday}</span>
                    )}
                    {isPast ? (
                      <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#E5E5E5] text-[#ADADAD]">
                        종료
                      </span>
                    ) : registeredRounds.includes(e.round) ? (
                      <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg border-2 border-[#00A651] bg-[#00A651]/10 text-[#00A651]">
                        신청 완료
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          if (!_accessCodeUsed) { setShowCodePopup(true); return }
                          setExamRound(e.round); setShowSubjectConfirmModal(true)
                        }}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[#00A651] ${
                          isNext ? 'bg-[#00A651] text-white' : 'bg-white text-[#00A651]'
                        }`}
                      >
                        {isNext ? '신청하기' : '사전 신청하기'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {/* 실제 시험일 카드 */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border-2 border-[#F5A623] bg-[#F5A623]/5">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[14px] bg-[#F5A623]/20">🎯</div>
                <div>
                  <p className="text-[13px] font-bold text-[#1A1A1A]">6월 13일 (토)</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#F5A623] bg-[#F5A623]/15 px-2.5 py-1 rounded-full">
                실제 시험일 🎯
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // ⑤ PROFILE TAB
  // ══════════════════════════════════════════════════════════════════
  const renderProfile = () => {
    const currentStyle   = styleType ?? style
    const styleMeta      = currentStyle ? STYLE_META[currentStyle] : null

    // 자격증/과목 섹션용 (DB 우선, 하드코딩 폴백)
    const displayCertName   = certLabel || profileCert || ''
    const fallbackRequiredP = certKey === 'exercise-prescriptionist'
      ? healthCertSubjects.map((s) => s.name)
      : (REQUIRED_SUBJECTS[certKey] ?? [])
    const effectiveReqP     = dbRequiredNames.length > 0 ? dbRequiredNames : fallbackRequiredP
    const requiredInP       = subjects.filter((s) => effectiveReqP.includes(s))
    const optionalInP       = subjects.filter((s) => !effectiveReqP.includes(s))
    const showSubjectLabels = effectiveReqP.length > 0

    // 학습 목표 섹션용 (DB 우선, 하드코딩 폴백)
    const selectedCertKeyGoal = Object.entries(CERT_LABELS).find(([, v]) => v === certTypeInput)?.[0] ?? ''
    const goalRequiredFromDB  = dbGoalSubjects.filter((s) => s.is_required).map((s) => s.name)
    const goalOptionalFromDB  = dbGoalSubjects.filter((s) => !s.is_required).map((s) => s.name)
    const fallbackGoalSubs    = selectedCertKeyGoal === 'exercise-prescriptionist'
      ? healthCertSubjects.map((s) => s.name)
      : (selectedCertKeyGoal ? (REQUIRED_SUBJECTS[selectedCertKeyGoal] ?? []) : [])
    const goalRequiredSubs    = goalRequiredFromDB.length > 0 ? goalRequiredFromDB : fallbackGoalSubs
    const goalOptionalSubs    = goalOptionalFromDB
    const _hasGoalSubjects    = goalRequiredSubs.length > 0 || goalOptionalSubs.length > 0
    const selectedYear         = examDateInput ? new Date(examDateInput).getFullYear() : null

    // 공통 과목 행 컴포넌트 (inline)
    const SubjectRowP = ({ name, hasBorder }: { name: string; hasBorder: boolean }) => {
      const card     = subjectCards.find((c) => c.name === name)
      const meta     = SUBJECT_META[name] ?? { icon: '📚', desc: '' }
      const progress = subjectProgress[name]
      const pct      = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0
      return (
        <button
          onClick={() => { if (card?.subjectId) router.push(`/chapters/${card.subjectId}`) }}
          disabled={!card?.subjectId}
          className={`w-full px-4 py-3 flex items-center gap-3 text-left active:bg-[#F5F5F3] disabled:opacity-60 ${hasBorder ? 'border-b border-[#F0F0EE]' : ''}`}
        >
          <div className="w-8 h-8 rounded-lg bg-[#F5F5F3] flex items-center justify-center text-[16px] flex-shrink-0">{meta.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#1A1A1A] truncate">{name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {progress !== undefined ? (
                <>
                  <div className="flex-1 h-1 bg-[#F0F0EE] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00A651] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-[#ADADAD] flex-shrink-0 font-semibold">{pct}%</span>
                </>
              ) : (
                <span className="text-[10px] text-[#ADADAD]">학습 시작 전</span>
              )}
            </div>
          </div>
          {card?.subjectId
            ? <ChevronRight size={13} className="text-[#ADADAD] flex-shrink-0" />
            : <span className="text-[10px] text-[#ADADAD] flex-shrink-0">준비중</span>
          }
        </button>
      )
    }

    return (
      <div className="overflow-y-auto p-4 pb-[130px] space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>
        <div className="pt-8">
          <h2 className="text-[20px] font-black text-[#1A1A1A]">내 정보</h2>
        </div>

        {/* ── 1. 학습 성향 ── */}
        <div>
          <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">학습 성향</p>
          {styleMeta ? (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] px-4 py-4 flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-[26px] flex-shrink-0"
                style={{ backgroundColor: `${styleMeta.color}18` }}
              >
                {styleMeta.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-black text-[#1A1A1A]">{styleMeta.label}</p>
                <p className="text-[11px] text-[#ADADAD] mt-0.5 leading-snug">{styleMeta.desc}</p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem(STYLE_KEY)
                  localStorage.removeItem('kinepia_learning_type')
                  router.push('/onboarding/style-test')
                }}
                className="flex-shrink-0 text-[11px] text-[#6B6B6B] border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 font-semibold"
              >
                다시 확인하기
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push('/onboarding/style-test')}
              className="w-full bg-white rounded-2xl border-2 border-dashed border-[#E5E5E5] px-4 py-4 flex items-center gap-3 active:bg-[#F5F5F3]"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#F5F5F3] flex items-center justify-center text-[24px] flex-shrink-0">🧩</div>
              <div className="flex-1 text-left">
                <p className="text-[14px] font-bold text-[#1A1A1A]">학습 유형 분석하기</p>
                <p className="text-[11px] text-[#ADADAD] mt-0.5">나에게 맞는 학습 방법을 찾아보세요</p>
              </div>
              <ChevronRight size={16} className="text-[#ADADAD] flex-shrink-0" />
            </button>
          )}
        </div>

        {/* ── 2. 이용 코드 ── */}
        <div>
          <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">이용 코드</p>
          <div className="bg-white rounded-2xl border border-[#E5E5E5] px-4 py-4">
            <p className="text-[13px] font-bold text-[#1A1A1A] mb-1">무료 이용권 코드 입력</p>
            <p className="text-[11px] text-[#ADADAD] mb-3">코드를 입력하면 모든 과목을 무료로 이용할 수 있어요.</p>
            <button
              onClick={() => setShowCodePopup(true)}
              className="text-[12px] font-bold text-[#00A651] border border-[#00A651]/30 bg-[#00A651]/5 px-3 py-2 rounded-xl"
            >
              코드 입력하러 가기
            </button>
          </div>
        </div>

        {/* ── 3. 수강 자격증 & 학습 목표 (collapsible) ── */}
        <div>
          <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">수강 자격증 &amp; 학습 목표</p>
          <div
            className="bg-white rounded-2xl border border-[#E5E5E5] px-4 py-3 cursor-pointer"
            onClick={() => {
              if (!certOpen && certOrder.length === 0) {
                const sortedCerts = [...userCerts].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
                setCertOrder(sortedCerts.map((c) => c.cert_id))
                const savedOrder = JSON.parse(localStorage.getItem('kinepia_subject_order') ?? '{}')
                const initialSubjectOrder: Record<string, string[]> = {}
                sortedCerts.forEach((cert) => {
                  initialSubjectOrder[cert.cert_id] = savedOrder[cert.cert_id] ?? cert.subjects ?? []
                })
                setSubjectOrderByCert(initialSubjectOrder)
              }
              setCertOpen(!certOpen)
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[15px]">🎯</span>
                <div>
                  <p className="text-[13px] font-bold text-[#1A1A1A]">자격증 · 과목 · 학습 목표</p>
                  <p className="text-[11px] text-[#ADADAD]">
                    {displayCertName || '자격증을 선택하세요'}
                    {subjects.length > 0 ? ` · ${subjects.length}개 과목` : ''}
                  </p>
                </div>
              </div>
              <span className={`text-[#ADADAD] text-[18px] transition-transform inline-block ${certOpen ? 'rotate-90' : ''}`}>›</span>
            </div>

            {certOpen && (
              <div className="mt-3 pt-3 border-t border-[#E5E5E5]" onClick={(e) => e.stopPropagation()}>

                {/* A. 자격증 학습 우선순위 */}
                {certOrder.length > 1 && (
                  <div className="mb-4">
                    <p className="text-[11px] text-[#ADADAD] font-medium mb-2">자격증 학습 우선순위</p>
                    {certOrder.map((certId, idx) => {
                      const cert = userCerts.find((c) => c.cert_id === certId)
                      if (!cert) return null
                      return (
                        <div key={certId} className="flex items-center justify-between py-2 border-b border-[#F5F5F3] last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#ADADAD] w-4">{idx + 1}</span>
                            <span className="text-[13px] text-[#1A1A1A]">{cert.cert_label}</span>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => moveCert(idx, 'up')} disabled={idx === 0}
                              className="w-[26px] h-[26px] flex items-center justify-center border border-[#E0E0E0] rounded-[6px] text-[#888] disabled:opacity-30 text-[12px]">↑</button>
                            <button onClick={() => moveCert(idx, 'down')} disabled={idx === certOrder.length - 1}
                              className="w-[26px] h-[26px] flex items-center justify-center border border-[#E0E0E0] rounded-[6px] text-[#888] disabled:opacity-30 text-[12px]">↓</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* B. 자격증별 과목 순서 */}
                {certOrder.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[11px] text-[#ADADAD] font-medium mb-2">과목 학습 순서</p>
                    {certOrder.map((certId) => {
                      const cert = userCerts.find((c) => c.cert_id === certId)
                      const subjs = subjectOrderByCert[certId] ?? []
                      if (!cert || subjs.length === 0) return null
                      return (
                        <div key={certId} className="mb-3">
                          <p className="text-[11px] font-bold text-[#1A1A1A] mb-1">{cert.cert_label}</p>
                          {subjs.map((subj, idx) => (
                            <div key={subj} className="flex items-center justify-between py-1.5 border-b border-[#F5F5F3] last:border-0 pl-2">
                              <span className="text-[12px] text-[#1A1A1A]">{subj}</span>
                              <div className="flex gap-1">
                                <button onClick={() => moveSubject(certId, idx, 'up')} disabled={idx === 0}
                                  className="w-[26px] h-[26px] flex items-center justify-center border border-[#E0E0E0] rounded-[6px] text-[#888] disabled:opacity-30 text-[12px]">↑</button>
                                <button onClick={() => moveSubject(certId, idx, 'down')} disabled={idx === subjs.length - 1}
                                  className="w-[26px] h-[26px] flex items-center justify-center border border-[#E0E0E0] rounded-[6px] text-[#888] disabled:opacity-30 text-[12px]">↓</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                    <button onClick={handleOrderSave}
                      className="w-full py-2.5 rounded-2xl bg-[#1A1A1A] text-white text-[13px] font-bold mt-1">
                      순서 저장
                    </button>
                  </div>
                )}

                {/* B. 수강 과목 */}
                <p className="text-[11px] font-bold text-[#6B6B6B] mb-2">수강 과목</p>
                {displayCertName ? (
                  subjects.length === 0 ? (
                    <div className="py-3 text-center">
                      <p className="text-[12px] text-[#ADADAD] mb-2">아직 선택한 과목이 없어요</p>
                      <button
                        onClick={() => router.push('/select-subject')}
                        className="px-4 py-2 bg-[#00A651] text-white rounded-xl text-[12px] font-bold"
                      >
                        과목 선택하기
                      </button>
                    </div>
                  ) : showSubjectLabels ? (
                    <div className="space-y-1 mb-4">
                      {requiredInP.length > 0 && (
                        <>
                          <p className="text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider mb-1">필수과목</p>
                          {requiredInP.map((name, idx) => (
                            <SubjectRowP key={name} name={name} hasBorder={idx < requiredInP.length - 1 || optionalInP.length > 0} />
                          ))}
                        </>
                      )}
                      {optionalInP.length > 0 && (
                        <>
                          <p className="text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider mt-2 mb-1">선택과목</p>
                          {optionalInP.map((name, idx) => (
                            <SubjectRowP key={name} name={name} hasBorder={idx < optionalInP.length - 1} />
                          ))}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1 mb-4">
                      {subjects.map((name, idx) => (
                        <SubjectRowP key={name} name={name} hasBorder={idx < subjects.length - 1} />
                      ))}
                    </div>
                  )
                ) : (
                  <button
                    onClick={() => router.push('/select-cert')}
                    className="w-full flex items-center gap-2 py-3 text-[12px] text-[#00A651] font-bold"
                  >
                    <Plus size={14} /> 자격증 추가하기
                  </button>
                )}

                {/* 학습 목표 */}
                <p className="text-[11px] font-bold text-[#6B6B6B] mb-3 mt-2">학습 목표</p>

                {/* 목표 자격증 */}
                <div className="mb-3">
                  <p className="text-[10px] text-[#ADADAD] mb-1.5">목표 자격증</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'exercise-prescriptionist', label: '건강운동관리사' },
                      { key: 'sports-instructor-2',     label: '2급 생활스포츠지도사' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setCertTypeInput(label)}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-bold border-2 transition-all ${
                          certTypeInput === label
                            ? 'bg-[#00A651] border-[#00A651] text-white'
                            : 'bg-white border-[#E5E5E5] text-[#6B6B6B]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 시험 연도 */}
                <div className="mb-3">
                  <p className="text-[10px] text-[#ADADAD] mb-1.5">
                    시험 연도
                    {selectedYear && examDateInput && (
                      <span className="ml-1">({new Date(examDateInput).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 기준)</span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    {([2026, 2027, 2028] as const).map((year) => (
                      <button
                        key={year}
                        onClick={() => setExamDateInput(CERT_EXAM_DATES[year])}
                        className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 transition-all ${
                          selectedYear === year
                            ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                            : 'bg-white border-[#E5E5E5] text-[#6B6B6B]'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 지역 */}
                <div className="mb-3">
                  <label className="text-[10px] text-[#ADADAD] mb-1.5 flex items-center gap-1">
                    <MapPin size={10} /> 지역
                  </label>
                  <input
                    type="text"
                    placeholder="예: 서울, 부산, 대구..."
                    value={regionInput}
                    onChange={(e) => setRegionInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#1A1A1A] outline-none focus:border-[#00A651]"
                  />
              </div>

                {/* 저장 버튼 (자격증·목표) */}
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="w-full py-3 bg-[#111111] text-white rounded-xl text-[13px] font-bold disabled:opacity-40"
                >
                  {savingProfile ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      저장 중...
                    </span>
                  ) : '저장하기'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 4. 학습 방법 (collapsible) ── */}
        <div>
          <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">학습 방법</p>
          <div
            className="bg-white rounded-2xl border border-[#E5E5E5] px-4 py-3 cursor-pointer"
            onClick={() => setMethodOpen(!methodOpen)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[15px]">📖</span>
                <div>
                  <p className="text-[13px] font-bold text-[#1A1A1A]">학습 방법 설정</p>
                  <p className="text-[11px] text-[#ADADAD]">학습 방식과 알림을 설정하세요</p>
                </div>
              </div>
              <span className={`text-[#ADADAD] text-[18px] transition-transform inline-block ${methodOpen ? 'rotate-90' : ''}`}>›</span>
            </div>
            {methodOpen && (
              <div className="mt-3 pt-3 border-t border-[#E5E5E5]" onClick={(e) => e.stopPropagation()}>

                {/* 하루 공부 시간 */}
                <div className="mb-3">
                  <label className="text-[10px] text-[#ADADAD] mb-1.5 flex items-center gap-1">
                    <Clock size={10} /> 하루 공부 시간
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['30분', '1시간', '2시간', '3시간+'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setStudyTimeInput(t)}
                        className={`py-2 rounded-xl text-[11px] font-bold border-2 transition-all ${
                          studyTimeInput === t
                            ? 'bg-[#00A651] border-[#00A651] text-white'
                            : 'bg-white border-[#E5E5E5] text-[#6B6B6B]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 하루 공부 횟수 */}
                <div className="mb-3">
                  <p className="text-[10px] text-[#ADADAD] mb-1.5">하루 공부 횟수</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['1회', '2회', '3회+'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setStudyCountInput(c)}
                        className={`py-2 rounded-xl text-[12px] font-bold border-2 transition-all ${
                          studyCountInput === c
                            ? 'bg-[#00A651] border-[#00A651] text-white'
                            : 'bg-white border-[#E5E5E5] text-[#6B6B6B]'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 주요 학습 시간대 */}
                <div className="mb-3">
                  <p className="text-[10px] text-[#ADADAD] mb-1.5">주요 학습 시간대</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: '오전', emoji: '🌅' },
                      { label: '오후', emoji: '☀️' },
                      { label: '저녁', emoji: '🌆' },
                      { label: '새벽', emoji: '🌙' },
                    ].map(({ label, emoji }) => (
                      <button
                        key={label}
                        onClick={() => setStudyTimeSlotInput(label)}
                        className={`py-2 rounded-xl text-[11px] font-bold border-2 transition-all flex flex-col items-center gap-0.5 ${
                          studyTimeSlotInput === label
                            ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                            : 'bg-white border-[#E5E5E5] text-[#6B6B6B]'
                        }`}
                      >
                        <span className="text-[14px]">{emoji}</span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 학습 알리미 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Bell size={13} className="text-[#6B6B6B]" />
                    <p className="text-[12px] font-bold text-[#1A1A1A]">학습 알리미</p>
                  </div>
                  <span className="text-[10px] text-[#ADADAD]">앱 설치 후 사용 가능</span>
                </div>

                {/* 학습 방법 저장 버튼 */}
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="w-full py-3 bg-[#111111] text-white rounded-xl text-[13px] font-bold disabled:opacity-40"
                >
                  {savingProfile ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      저장 중...
                    </span>
                  ) : '저장하기'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 5. 광고 ── */}
        <div className="flex flex-col items-center mt-6 mb-2 px-4">
          <span className="text-[9px] text-[#ADADAD] mb-1 self-start">광고</span>
          {tab === 'profile' && <KakaoAdFit unit="DAN-LTearBRyYBpdjEd9" width={320} height={100} />}
        </div>

        {/* ── 6. 최근 학습 활동 (collapsible) ── */}
        <div>
          <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">최근 학습 활동</p>
          <div
            className="bg-white rounded-2xl border border-[#E5E5E5] px-4 py-3 cursor-pointer"
            onClick={() => setActivityOpen(!activityOpen)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[15px]">📋</span>
                <div>
                  <p className="text-[13px] font-bold text-[#1A1A1A]">최근 학습 활동</p>
                  <p className="text-[11px] text-[#ADADAD]">
                    {recentActivity.length > 0
                      ? `최근: ${recentActivity[0].chapter_title}`
                      : '아직 학습 기록이 없어요'}
                  </p>
                </div>
              </div>
              <span className={`text-[#ADADAD] text-[18px] transition-transform inline-block ${activityOpen ? 'rotate-90' : ''}`}>›</span>
            </div>
            {activityOpen && (
              <div className="mt-3 pt-3 border-t border-[#E5E5E5]" onClick={(e) => e.stopPropagation()}>
                {recentActivity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    <span className="text-[32px] mb-2">📚</span>
                    <p className="text-[13px] font-bold text-[#1A1A1A] mb-1">아직 학습 기록이 없어요</p>
                    <p className="text-[11px] text-[#ADADAD] text-center mb-4">강의실에서 첫 학습을 시작해 보세요!</p>
                    <button
                      onClick={() => setTab('classroom')}
                      className="px-5 py-2 bg-[#00A651] text-white rounded-xl text-[12px] font-bold"
                    >
                      학습 시작하기
                    </button>
                  </div>
                ) : (
                  recentActivity.map((item, idx) => {
                    const meta = SUBJECT_META[item.subject_name] ?? { icon: '📚', desc: '' }
                    const scoreColor = item.score >= 80 ? '#00A651' : item.score >= 60 ? '#F5A623' : '#E24B4A'
                    const dateStr = item.date
                      ? new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                      : ''
                    return (
                      <div
                        key={item.chapter_id}
                        className={`relative flex items-center gap-3 py-3 ${idx < recentActivity.length - 1 ? 'border-b border-[#F0F0EE]' : ''} ${item.bestScore === 100 ? 'border-l-2 border-[#FFD54F] pl-2' : ''}`}
                      >
                        {item.bestScore === 100 && (
                          <div className="absolute top-2 right-0 text-[#FFD54F]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M8 21h8M12 17v4M17 7A5 5 0 0 1 7 7H6a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4h-1z"/>
                              <path d="M6 7H4a2 2 0 0 0 0 4h2M18 7h2a2 2 0 0 0 0-4h-2"/>
                            </svg>
                          </div>
                        )}
                        <div className="w-7 h-7 rounded-lg bg-[#F5F5F3] flex items-center justify-center text-[14px] flex-shrink-0">
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-[#1A1A1A] truncate">{item.chapter_title}</p>
                          <p className="text-[10px] text-[#ADADAD] truncate">{item.subject_name}{dateStr ? ` · ${dateStr}` : ''}</p>
                        </div>
                        <span className="text-[12px] font-black flex-shrink-0" style={{ color: scoreColor }}>
                          {item.score}점
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 7. 기타 링크 ── */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          {[
            { label: '개인정보 설정',   path: '/settings/privacy', icon: '🔒' },
            { label: '개인정보처리방침', path: '/privacy',          icon: '📄' },
            { label: '이용약관',        path: '/terms',            icon: '📋' },
          ].map((item, idx, arr) => (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-3 text-left active:bg-[#F5F5F3] ${idx < arr.length - 1 ? 'border-b border-[#F0F0EE]' : ''}`}
            >
              <span className="text-[16px] w-6 text-center">{item.icon}</span>
              <span className="flex-1 text-[13px] text-[#1A1A1A]">{item.label}</span>
              <ChevronRight size={14} className="text-[#ADADAD]" />
            </button>
          ))}
        </div>

        {/* 로그아웃 */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full py-3 text-[13px] font-semibold text-[#E24B4A]"
        >
          로그아웃
        </button>

        {/* 로그아웃 확인 모달 */}
        {showLogoutModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
            <div className="w-full max-w-xs bg-white rounded-2xl p-6">
              <p className="text-[16px] font-bold text-[#1A1A1A] text-center mb-6">로그아웃 하시겠습니까?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3 rounded-xl border-2 border-[#E5E5E5] text-[14px] font-semibold text-[#6B6B6B]"
                >
                  취소
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: '/trainer/dashboard' })}
                  className="flex-1 py-3 rounded-xl bg-[#E24B4A] text-white text-[14px] font-bold"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="bg-[#F5F5F3] flex flex-col" style={{ height: '100dvh', maxHeight: '100dvh' }}>
      <div className="flex-1 overflow-hidden pb-16">
        {tab === 'home'      && renderHome()}
        {tab === 'classroom' && renderClassroom()}
        {tab === 'exam'      && renderExam()}
        {tab === 'profile'   && renderProfile()}
      </div>


      <BottomTabBar />

      {/* ── 이용 설문 팝업 ── */}
      {showSurveyPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto p-6 pb-10">
            <div className="w-10 h-1 bg-[#E5E5E5] rounded-full mx-auto mb-5" />

            {surveyDone ? (
              <div className="flex flex-col items-center py-6">
                <div className="w-[52px] h-[52px] rounded-full bg-[#e8f7ef] flex items-center justify-center mb-4">
                  <span className="text-[#1a9e5c] text-[24px]">✓</span>
                </div>
                <p className="text-[16px] font-medium text-[#1A1A1A] mb-2">
                  설문에 응해주셔서 감사해요
                </p>
                <p className="text-[13px] text-[#888] text-center leading-relaxed">
                  소중한 의견이 Kinepia를<br/>더 좋게 만드는 데 도움이 됩니다.
                </p>
              </div>
            ) : (
            <>
            {/* Q1 */}
            {surveyStep === 0 && (
              <div>
                <p className="text-[16px] font-bold mb-1">학습하면서 가장 도움이 된 기능은?</p>
                <p className="text-[12px] text-[#ADADAD] mb-4">1 / 4</p>
                {['학습 슬라이드', '챕터 테스트', '오답노트', 'D-Day 플랜'].map(opt => (
                  <button key={opt}
                    onClick={() => {
                      setSurveyQ1Temp(opt)
                      setTimeout(() => {
                        setSurveyQ1(opt)
                        setSurveyStep(1)
                        setSurveyQ2Temp('')
                      }, 350)
                    }}
                    className={`w-full text-left px-4 py-3 mb-2 rounded-2xl text-[13px] font-medium transition-colors ${
                      surveyQ1Temp === opt
                        ? 'border-[1.5px] border-[#00A651] bg-[#f0fbf4]'
                        : 'border border-[#E5E5E5]'
                    }`}>
                    {opt}
                  </button>
                ))}
                <button onClick={() => setShowSurveyPopup(false)}
                  className="w-full py-2 text-[12px] text-[#ADADAD] mt-2 text-center">
                  다음에 하기
                </button>
              </div>
            )}

            {/* Q2 */}
            {surveyStep === 1 && (
              <div>
                <p className="text-[16px] font-bold mb-1">학습 콘텐츠 난이도는 어떠셨나요?</p>
                <p className="text-[12px] text-[#ADADAD] mb-4">2 / 4</p>
                {['너무 어려워요', '적당해요', '쉬워요', '모르겠어요'].map(opt => (
                  <button key={opt}
                    onClick={() => {
                      setSurveyQ2Temp(opt)
                      setTimeout(() => {
                        setSurveyQ2(opt)
                        setSurveyStep(2)
                      }, 350)
                    }}
                    className={`w-full text-left px-4 py-3 mb-2 rounded-2xl text-[13px] font-medium transition-colors ${
                      surveyQ2Temp === opt
                        ? 'border-[1.5px] border-[#00A651] bg-[#f0fbf4]'
                        : 'border border-[#E5E5E5]'
                    }`}>
                    {opt}
                  </button>
                ))}
                <button
                  onClick={() => { setSurveyQ1Temp(surveyQ1); setSurveyStep(0) }}
                  className="w-full py-2 text-[12px] text-[#ADADAD] mt-2 text-center">
                  이전
                </button>
              </div>
            )}

            {/* Q3 (step 2) 개선사항 자유 서술 */}
            {surveyStep === 2 && (
              <div>
                <p className="text-[16px] font-bold mb-1">Kinepia에 필요한 기능이나 개선사항을 자유롭게 작성해주세요</p>
                <p className="text-[12px] text-[#ADADAD] mb-3">3 / 5</p>
                <textarea
                  value={surveyFeedback}
                  onChange={e => setSurveyFeedback(e.target.value)}
                  placeholder="자유롭게 작성해주세요"
                  rows={4}
                  className="w-full border border-[#E5E5E5] rounded-2xl px-4 py-3 text-[13px] outline-none resize-none mb-3"
                />
                <button
                  onClick={() => setSurveyStep(3)}
                  className="w-full py-3 rounded-2xl bg-[#1A1A1A] text-white text-[14px] font-bold mb-2">
                  다음
                </button>
                <button onClick={() => setSurveyStep(1)}
                  className="w-full py-2 text-[12px] text-[#ADADAD]">
                  이전
                </button>
              </div>
            )}

            {/* Q4 (step 3) 별점 */}
            {surveyStep === 3 && (
              <div>
                <p className="text-[16px] font-bold mb-1">별점으로 평가해주세요</p>
                <p className="text-[12px] text-[#ADADAD] mb-4">4 / 5</p>
                <div className="flex justify-center gap-3 mb-6">
                  {[1,2,3,4,5].map(n => (
                    <button key={n}
                      onClick={() => setSurveyStars(n)}
                      className={`text-[36px] transition-transform ${n <= surveyStars ? 'opacity-100' : 'opacity-30'}`}>
                      ⭐
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => surveyStars > 0 && setSurveyStep(4)}
                  disabled={!surveyStars}
                  className="w-full py-3 rounded-2xl bg-[#1A1A1A] text-white text-[14px] font-bold disabled:opacity-40 mb-2">
                  다음
                </button>
                <button onClick={() => setSurveyStep(2)}
                  className="w-full py-2 text-[12px] text-[#ADADAD]">
                  이전
                </button>
              </div>
            )}

            {/* Q5 (step 4) 한 문장 표현 + 동의 */}
            {surveyStep === 4 && (
              <div>
                <p className="text-[16px] font-bold mb-1">Kinepia를 한 문장으로 표현해주세요</p>
                <p className="text-[12px] text-[#ADADAD] mb-3">5 / 5</p>
                <textarea
                  value={surveyText}
                  onChange={e => setSurveyText(e.target.value)}
                  placeholder="자유롭게 작성해주세요"
                  rows={3}
                  className="w-full border border-[#E5E5E5] rounded-2xl px-4 py-3 text-[13px] outline-none resize-none mb-3"
                />
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <input type="checkbox"
                    checked={surveyConsent}
                    onChange={e => setSurveyConsent(e.target.checked)}
                    className="w-4 h-4 accent-[#00A651]" />
                  <span className="text-[12px] text-[#ADADAD]">
                    후기를 홍보에 활용하는 것에 동의합니다
                  </span>
                </label>
                <button
                  onClick={handleSurveySubmit}
                  disabled={surveyLoading}
                  className="w-full py-3 rounded-2xl bg-[#00A651] text-white text-[14px] font-bold disabled:opacity-40 mb-2">
                  {surveyLoading ? '제출 중...' : '완료'}
                </button>
                <button onClick={() => setSurveyStep(3)}
                  className="w-full py-2 text-[12px] text-[#ADADAD]">
                  이전
                </button>
              </div>
            )}
            </>
            )}
          </div>
        </div>
      )}

      {/* ── 응시 과목 확인 모달 ── */}
      {showSubjectConfirmModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-5 pb-10 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-[#E5E5E5] rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-black text-[#1A1A1A]">응시 과목 확인</h2>
              <button
                onClick={() => setShowSubjectConfirmModal(false)}
                className="w-8 h-8 flex items-center justify-center text-[#ADADAD]"
              >
                <X size={20} />
              </button>
            </div>

            {/* 응시 일정 + 시험 시간 */}
            <div className="bg-[#F5F5F3] rounded-2xl px-4 py-3 mb-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#6B6B6B]">응시 일정</span>
                <span className="text-[13px] font-bold text-[#1A1A1A]">
                  {EXAM_DATES.find((e) => e.round === examRound)?.date} · {examRound}회차
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#6B6B6B]">시험 시간</span>
                <span className="text-[13px] font-bold text-[#1A1A1A]">10:00 ~ 13:00 · 160분</span>
              </div>
            </div>

            <p className="text-[12px] text-[#ADADAD] mb-3">8개 과목 전체 응시 (변경 불가)</p>

            {/* 1교시 그룹 */}
            <div className="border-2 border-[#00A651]/40 rounded-2xl p-4 mb-3">
              <p className="text-[11px] font-black text-[#00A651] tracking-wider mb-2">1교시 · 80분</p>
              <div className="space-y-1.5">
                {['운동생리학', '건강체력평가', '운동처방론', '운동부하검사'].map((name, i) => (
                  <div key={name} className="flex items-center gap-3 px-3 py-2 bg-[#F5F5F3] rounded-xl">
                    <span className="text-[11px] font-bold text-[#ADADAD] w-4 flex-shrink-0">{i + 1}</span>
                    <span className="text-[13px] font-semibold text-[#1A1A1A]">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2교시 그룹 */}
            <div className="border-2 border-[#00A651]/40 rounded-2xl p-4 mb-6">
              <p className="text-[11px] font-black text-[#00A651] tracking-wider mb-2">2교시 · 80분</p>
              <div className="space-y-1.5">
                {['운동상해', '기능해부학', '병태생리학', '스포츠심리학'].map((name, i) => (
                  <div key={name} className="flex items-center gap-3 px-3 py-2 bg-[#F5F5F3] rounded-xl">
                    <span className="text-[11px] font-bold text-[#ADADAD] w-4 flex-shrink-0">{i + 5}</span>
                    <span className="text-[13px] font-semibold text-[#1A1A1A]">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowSubjectConfirmModal(false)}
                className="py-4 border border-[#E5E5E5] text-[#6B6B6B] rounded-2xl text-[15px] font-bold"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  setShowSubjectConfirmModal(false)
                  const updated = Array.from(new Set([...registeredRounds, examRound]))
                  setRegisteredRounds(updated)
                  localStorage.setItem('kinepia_registered_rounds', JSON.stringify(updated))
                  setShowRegisteredModal(true)
                }}
                className="py-4 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold"
              >
                확인 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 신청완료 팝업 ── */}
      {showRegisteredModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center">
            <div className="text-[52px] mb-3">🎉</div>
            <h2 className="text-[20px] font-black text-[#1A1A1A] mb-2">신청 완료!</h2>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-1">
              {EXAM_DATES.find((e) => e.round === examRound)?.date} {examRound}회차
            </p>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-6">
              모의고사 신청이 완료되었습니다.<br />
              {/* TODO: 날짜 검증 추가 예정 — 현재는 언제든 입장 가능 */}
              <span className="text-[12px] text-[#00A651] font-semibold">지금 바로 입장하실 수 있습니다.</span>
            </p>
            <div className="space-y-2">
              <button
                onClick={() => { setShowRegisteredModal(false); router.push('/exam') }}
                className="w-full py-3.5 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold"
              >
                입장하기
              </button>
              <button
                onClick={() => setShowRegisteredModal(false)}
                className="w-full py-3 text-[#6B6B6B] text-[14px] font-medium"
              >
                나중에 입장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 모의고사 방법 안내 모달 ── */}
      {showExamInfoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="w-full max-w-sm bg-white rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[17px] font-black text-[#1A1A1A]">모의고사 형식</h2>
              <button onClick={() => setShowExamInfoModal(false)} className="w-8 h-8 flex items-center justify-center text-[#ADADAD]">✕</button>
            </div>
            <div className="space-y-3 mb-6">
              {[
                { icon: '📝', label: '총 문항',   value: '160문항 (8과목 × 20문항)' },
                { icon: '⏱️', label: '시험 시간',  value: '160분' },
                { icon: '✅', label: '합격 기준',  value: '과목별 40% 이상 + 전체 60% 이상' },
                { icon: '🗓️', label: '시험 방식',  value: '4지선다형 객관식' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-[18px] flex-shrink-0">{icon}</span>
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[13px] text-[#6B6B6B]">{label}</span>
                    <span className="text-[13px] font-semibold text-[#1A1A1A]">{value}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowExamInfoModal(false)}
              className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[15px] font-bold"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* ── 아직 입장 시간 아님 모달 ── */}
      {showExamNotYetModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center">
            <div className="text-[44px] mb-3">⏳</div>
            <h2 className="text-[17px] font-black text-[#1A1A1A] mb-2">아직 입장 시간이 아닙니다</h2>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-6">
              입장 가능 시간은 09:50 ~ 10:01 입니다.
            </p>
            <button
              onClick={() => setShowExamNotYetModal(false)}
              className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[15px] font-bold"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* ── 입장 마감 안내 모달 ── */}
      {showExamClosedModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center">
            <div className="text-[44px] mb-3">⏰</div>
            <h2 className="text-[17px] font-black text-[#1A1A1A] mb-2">입장이 마감되었습니다</h2>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-6">
              모의고사가 시작되었습니다.<br />
              다음 일정에 참여하세요.
            </p>
            <button
              onClick={() => setShowExamClosedModal(false)}
              className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[15px] font-bold"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* ── 구술 모의고사: 날짜 선택 바텀시트 ── */}
      {showOralDatePicker && oralPickerTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-5 pb-10">
            <div className="w-10 h-1 bg-[#E5E5E5] rounded-full mx-auto mb-5" />
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-[18px] font-black text-[#1A1A1A]">
                  {oralPickerTarget.weekNum}주차 {oralPickerTarget.slot}회차
                </h2>
                <p className="text-[13px] text-[#ADADAD] mt-1">응시할 날짜를 선택하세요</p>
              </div>
              <button
                onClick={() => { setShowOralDatePicker(false); setOralPickerDate(null); setOralPickerTarget(null) }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5F5F3] text-[#6B6B6B] flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {['월', '화', '수', '목', '금', '토', '일'].map((d, i) => (
                <div
                  key={d}
                  className={`text-center text-[11px] font-bold ${i >= 5 ? 'text-[#E24B4A]' : 'text-[#ADADAD]'}`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* 날짜 버튼 7개 */}
            <div className="grid grid-cols-7 gap-1.5 mb-5">
              {(() => {
                const usedDatesInWeek = oralRegs
                  .filter(r => r.week_number === oralPickerTarget.weekNum)
                  .map(r => r.exam_date)
                return oralPickerTarget.weekDates.map((dateStr, i) => {
                const isPast = dateStr < new Date().toISOString().split('T')[0]
                const isUsed = usedDatesInWeek.includes(dateStr)
                const isSelected = oralPickerDate === dateStr
                const isSatSun = i >= 5
                return (
                  <button
                    key={dateStr}
                    disabled={isPast || isUsed}
                    onClick={() => setOralPickerDate(dateStr)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${
                      isPast || isUsed ? 'opacity-30 cursor-not-allowed' : ''
                    } ${
                      isSelected
                        ? 'bg-[#1A1A1A] text-white'
                        : isSatSun
                        ? 'bg-[#FFF0F0] text-[#E24B4A]'
                        : 'bg-[#F5F5F3] text-[#1A1A1A]'
                    }`}
                  >
                    <span className="text-[12px] font-bold">{dateStr.split('-')[2]}</span>
                  </button>
                )
              })
              })()}
            </div>

            <p className="text-[12px] font-bold text-[#E24B4A] text-center mb-4">신청 후 변경이 불가합니다</p>

            <button
              disabled={!oralPickerDate || oralSubmitting}
              onClick={() => {
                if (!oralPickerDate || !oralPickerTarget || oralSubmitting) return
                setOralSubmitting(true)
                fetch('/api/v1/oral-exam-reg', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    certificationId: 'cc68cb0c-6c32-4b14-a7d7-e422a5bc9954',
                    examDate: oralPickerDate,
                    weekNumber: oralPickerTarget.weekNum,
                    slotNumber: oralPickerTarget.slot,
                  }),
                })
                  .then((r) => r.json())
                  .then((d) => {
                    if (d.data) {
                      setOralRegs((prev) => [...prev, d.data])
                      setShowOralTicket(d.data)
                    }
                    setShowOralDatePicker(false)
                    setOralPickerDate(null)
                    setOralSubmitting(false)
                  })
              }}
              className={`w-full py-4 rounded-2xl text-[15px] font-bold transition-colors ${
                oralPickerDate && !oralSubmitting
                  ? 'bg-[#1A1A1A] text-white active:bg-[#333]'
                  : 'bg-[#F5F5F3] text-[#ADADAD]'
              }`}
            >
              {oralSubmitting ? '신청 중...' : '신청 완료'}
            </button>
          </div>
        </div>
      )}

      {/* ── 구술 모의고사: 수험표 바텀시트 ── */}
      {showOralTicket && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-3xl overflow-hidden">
            {/* 검정 헤더 */}
            <div className="bg-[#1A1A1A] px-5 pt-6 pb-8 text-center">
              <p className="text-[12px] font-bold text-white/50 mb-4">2급 생활스포츠지도사 구술/실기</p>
              <p className="text-[64px] font-black text-white leading-none">
                #{showOralTicket.ticket_number}
              </p>
              <p className="text-[12px] font-bold text-white/40 mt-2">수험번호</p>
            </div>

            {/* 본문 */}
            <div className="px-5 py-5 space-y-3">
              {(() => {
                const startParts = showOralTicket.start_time.split(':').map(Number)
                const endTotalMin = startParts[0] * 60 + startParts[1] + 10
                const endH = Math.floor(endTotalMin / 60)
                const endM = endTotalMin % 60
                const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
                return (
                  <>
                    {[
                      { label: '응시일',        value: showOralTicket.exam_date },
                      { label: '수험번호',       value: `#${showOralTicket.ticket_number}` },
                      { label: '배정 시간',      value: showOralTicket.start_time.slice(0, 5) },
                      { label: '입장 가능 시간', value: `${showOralTicket.start_time.slice(0, 5)} ~ ${endTimeStr}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-[#F0F0EE]">
                        <span className="text-[13px] text-[#ADADAD]">{label}</span>
                        <span className="text-[13px] font-bold text-[#1A1A1A]">{value}</span>
                      </div>
                    ))}
                    <div className="mt-3 bg-[#00A651]/10 rounded-xl px-4 py-3 text-center">
                      <p className="text-[12px] font-bold text-[#00A651]">수험 시간 외 입장 불가</p>
                    </div>
                  </>
                )
              })()}
            </div>

            <div className="px-5 pb-10">
              <button
                onClick={() => setShowOralTicket(null)}
                className="w-full py-4 rounded-2xl border-2 border-[#E5E5E5] text-[15px] font-bold text-[#6B6B6B] active:bg-[#F5F5F3]"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 구술 모의고사: 수험 시간 오류 팝업 ── */}
      {showOralTimeError && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center">
            <div className="text-[44px] mb-3">⏰</div>
            <h2 className="text-[17px] font-black text-[#1A1A1A] mb-2">수험 시간 외 입장 불가</h2>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-6">
              배정된 수험 시간에만 입장할 수 있어요.<br />
              수험표에서 배정 시간을 확인해 주세요.
            </p>
            <button
              onClick={() => setShowOralTimeError(false)}
              className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[15px] font-bold"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* ── 구술 모의고사: 신청 내역 없음 팝업 ── */}
      {showOralNoReg && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center">
            <div className="text-[44px] mb-3">📋</div>
            <h2 className="text-[17px] font-black text-[#1A1A1A] mb-2">신청 내역이 없습니다</h2>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-6">
              원하는 날짜에 구술 모의고사를 신청해 보세요.
            </p>
            <button
              onClick={() => setShowOralNoReg(false)}
              className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[15px] font-bold"
            >
              신청하러 가기
            </button>
          </div>
        </div>
      )}

      {/* ── 휴대폰 번호 등록 모달 ── */}
      {showPhoneModal && (
        <PhoneRegisterModal onClose={() => setShowPhoneModal(false)} />
      )}

      {/* ── 로그인 유도 바텀시트 ── */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-end justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <div className="w-10 h-1 bg-[#E5E5E5] rounded-full mx-auto mb-6" />
            <div className="text-center mb-6">
              <div className="text-[44px] mb-3">🔐</div>
              <h2 className="text-[18px] font-black text-[#1A1A1A] mb-2">로그인이 필요해요</h2>
              <p className="text-[13px] text-[#6B6B6B] leading-relaxed">무료로 시작하고 학습 기록을 저장하세요</p>
            </div>
            <button
              onClick={() => signIn('google', { callbackUrl: '/trainer/dashboard' })}
              className="w-full flex items-center justify-center gap-2 py-3 mb-3 border border-[#E5E5E5] rounded-2xl text-[14px] font-medium"
            >
              <span>🔍</span> 구글로 시작하기
            </button>
            <button
              onClick={() => signIn('kakao', { callbackUrl: '/trainer/dashboard' })}
              className="w-full flex items-center justify-center gap-2 py-3 mb-3 bg-[#FEE500] rounded-2xl text-[14px] font-medium text-[#1A1A1A]"
            >
              <span>💬</span> 카카오로 시작하기
            </button>
            {/* 네이버 로그인 */}
            <button
              onClick={() => signIn('naver', { callbackUrl: '/trainer/dashboard' })}
              className="w-full flex items-center justify-center gap-2 py-3 mb-4 bg-[#03C75A] rounded-2xl text-[14px] font-medium text-white"
            >
              <span>N</span> 네이버로 시작하기
            </button>
            <button
              onClick={() => setShowLoginPrompt(false)}
              className="w-full py-2.5 text-[13px] text-[#ADADAD] text-center"
            >
              나중에 하기
            </button>
          </div>
        </div>
      )}

      {/* ── 이용권 코드 입력 팝업 ── */}
      {showCodePopup && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center px-6">
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
              onClick={dismissCodePopup}
              className="w-full py-2.5 mt-2 text-[13px] text-[#ADADAD] text-center"
            >
              나중에 입력할게요
            </button>
          </div>
        </div>
      )}

      {/* ── 학습 유형 검사 팝업 ── */}
      {/* 로그인 상태 + profile-me 응답 완료(undefined 아님) + learning_style 미설정(null)인 경우에만 표시 */}
      {false && session && profileLearningStyle === null && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-7 text-center">
            <div className="text-[44px] mb-4">🧠</div>
            <h2 className="text-[18px] font-black text-[#1A1A1A] mb-2">학습 유형 분석</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-6">
              학습 유형을 분석하면<br />
              <span className="text-[#1A1A1A] font-semibold">나에게 맞는 맞춤 학습</span>이 가능합니다
            </p>
            <button
              onClick={() => { setProfileLearningStyle('skipped'); router.push('/onboarding/style-test') }}
              className="w-full py-4 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold mb-3"
            >
              지금 확인하기
            </button>
            <button
              onClick={() => {
                sessionStorage.setItem('kinepia_style_dismissed', '1')
                setProfileLearningStyle('dismissed')
              }}
              className="w-full py-3 text-[13px] text-[#ADADAD]"
            >
              나중에 할게요
            </button>
          </div>
        </div>
      )}

      {/* ── D-Day 설정 모달 ── */}
      {showDDayModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-black text-[#1A1A1A]">D-Day 설정</h2>
              <button onClick={() => setShowDDayModal(false)} className="w-8 h-8 flex items-center justify-center text-[#ADADAD]">
                <X size={20} />
              </button>
            </div>

            {/* 등록된 목록 */}
            {ddayGoals.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider">등록된 D-Day</p>
                {ddayGoals.map((goal) => {
                  const diff = Math.ceil((new Date(goal.exam_target_date).getTime() - Date.now()) / 86400000)
                  return (
                    <div key={goal.id} className="flex items-center gap-3 bg-[#F5F5F3] rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[#1A1A1A] truncate">{goal.cert_type}</p>
                        <p className="text-[11px] text-[#6B6B6B]">
                          {new Date(goal.exam_target_date).toLocaleDateString('ko-KR')}
                          {' · '}
                          <span className="font-bold text-[#00A651]">
                            {diff > 0 ? `D-${diff}` : diff === 0 ? 'D-Day' : `D+${Math.abs(diff)}`}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteDDayGoal(goal.id)}
                        className="text-[#ADADAD] hover:text-[#E24B4A]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 새 D-Day 추가 */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider">새 D-Day 추가</p>

              {/* 자격증 선택 */}
              <div className="grid grid-cols-2 gap-2">
                {['건강운동관리사', '생활스포츠지도사'].map((cert) => (
                  <button
                    key={cert}
                    onClick={() => setDdayNewCert(cert)}
                    className={`py-3 rounded-xl text-[12px] font-bold border-2 transition-all ${
                      ddayNewCert === cert
                        ? 'bg-[#00A651] border-[#00A651] text-white'
                        : 'bg-white border-[#E5E5E5] text-[#1A1A1A]'
                    }`}
                  >
                    {cert}
                  </button>
                ))}
              </div>

              {/* 날짜 선택 */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B6B6B] mb-1.5">
                  <Calendar size={12} /> 목표 시험일
                </label>
                <input
                  type="date"
                  value={ddayNewDate}
                  onChange={(e) => setDdayNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#1A1A1A] outline-none focus:border-[#00A651]"
                />
              </div>

              <button
                onClick={handleAddDDayGoal}
                disabled={!ddayNewDate || savingDDay}
                className="w-full py-3.5 bg-[#111111] text-white rounded-2xl text-[14px] font-bold disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {savingDDay
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />저장 중...</>
                  : <><Plus size={15} /> D-Day 등록</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#111111] text-white
          text-[13px] font-medium px-5 py-3 rounded-2xl shadow-lg z-[100]
          whitespace-nowrap flex items-center gap-2">
          <span className="text-[#4ade80] text-[15px]">✓</span>
          {toastMessage}
        </div>
      )}
    </div>
  )
}
