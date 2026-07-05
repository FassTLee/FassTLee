'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Heart as _Heart } from 'lucide-react'
import BottomTabBar from '@/components/common/BottomTabBar'
import { DashboardProvider, type DashboardContextType } from './_components/DashboardContext'
import HomeTab from './_components/HomeTab'
import ClassroomTab from './_components/ClassroomTab'
import ExamTab from './_components/ExamTab'
import ProfileTab from './_components/ProfileTab'
import DashboardModals from './_components/DashboardModals'
import type { CodeResultData } from './_components/constants'
import { getNextExamDate } from './_components/constants'

type Tab = 'home' | 'classroom' | 'exam' | 'profile'

const SUBJECTS_KEY  = 'kinepia_selected_subjects'
const CERT_KEY      = 'kinepia_selected_cert'
const STYLE_KEY     = 'kinepia_learning_style'
// ExamTab으로 이동, 분리 완료 후 일괄 제거 예정
const _ADMIN_EMAILS  = ['shotace@naver.com', 'prehabex@naver.com']

const CERT_LABELS: Record<string, string> = {
  'health-exercise-manager':       '운동건강관리사',
  'sports-instructor-2':           '2급 생활스포츠지도사',
  'sports-instructor':             '생활스포츠지도사',
  'exercise-prescriptionist':      '건강운동관리사',
  'sports-instructor-2-written':   '2급 생활스포츠지도사 필기',
  'sports-instructor-2-practical': '2급 생활스포츠지도사 구술/실기',
}

// HomeTab으로 이동, 분리 완료 후 일괄 제거 예정
const _CERT_ICONS: Record<string, string> = {
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

// 구술/실기 보디빌딩 과목 → subjectId 매핑 (ClassroomTab으로 이동, 분리 완료 후 일괄 제거 예정)
const _BODYBUILD_SUBJECTS: Record<string, string> = {
  '도핑 규정':         '6944e483-027e-4009-93e9-5826ac992d8a',
  '보디빌딩1':         '054b7ae7-59df-4f65-b357-5d64d7617cb5',
  '보디빌딩2':         '054b7ae7-59df-4f65-b357-5d64d7617cb5',
  '생활체육 지도 방법': '7b8b495b-5897-4de9-acf8-0557c5938ad2',
  '스포츠 인권':        '77119580-8805-4865-a705-65d515017771',
  '응급처치':           'b967339b-0195-4b7e-bceb-6ff1f4fc60f9',
  '협회 규정':          '01340b0e-af8a-4b8a-93bc-6ae11b3b2c54',
}

// 자격증별 필수/선택 과목 구분 (ProfileTab으로 이동, 분리 완료 후 일괄 제거 예정)
const _REQUIRED_SUBJECTS: Record<string, string[]> = {
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

// ProfileTab으로 이동, 분리 완료 후 일괄 제거 예정
const _STYLE_META: Record<string, { emoji: string; label: string; desc: string; color: string }> = {
  conceptualizer: { emoji: '💡', label: '이해형',  desc: '개념을 먼저 이해하고 응용하는 스타일',        color: '#F5A623' },
  memorizer:      { emoji: '🧠', label: '암기형',  desc: '반복과 암기로 실력을 쌓아가는 스타일',        color: '#6C63FF' },
  planner:        { emoji: '📅', label: '계획형',  desc: '체계적인 계획으로 꾸준히 나아가는 스타일',    color: '#00A651' },
  intensive:      { emoji: '🔥', label: '강제형',  desc: '집중 훈련으로 단기간에 성과를 내는 스타일',   color: '#E24B4A' },
}

// ProfileTab으로 이동, 분리 완료 후 일괄 제거 예정
const _CERT_EXAM_DATES: Record<number, string> = {
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

// ClassroomTab으로 이동, 분리 완료 후 일괄 제거 예정
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  /* ── D-Day (profiles.exam_target_date 단일 소스) ────────────────────── */
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
  // certId::subjectName 키 — 같은 subject를 여러 자격증이 공유하는 경우(예: IIPA Lv1/Lv2)
  // 자격증별로 분리된 진도율. 값이 없으면 subjectProgress(과목 전체 합산)로 폴백
  const [subjectProgressByCert, setSubjectProgressByCert] = useState<Record<string, { total: number; completed: number }>>({})
  const [userCerts, setUserCerts]             = useState<UserCertification[]>([])
  const [certSlugToId, setCertSlugToId]       = useState<Record<string, string>>({})

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

  // D-Day 모달 열릴 때 기본 날짜 자동 추천
  // 건강운동관리사: CERT_EXAM_DATES에서 오늘 이후 가장 가까운 실제 시험일을 계산
  // 그 외(추천 일정 없음): 오늘 날짜를 기본값으로 표시
  useEffect(() => {
    if (!showDDayModal || ddayNewDate) return
    const isHealthExercise =
      profileCert?.includes('건강운동관리사') ||
      certLabel?.includes('건강운동관리사')
    const recommended = isHealthExercise ? getNextExamDate() : null
    setDdayNewDate(recommended ?? new Date().toISOString().split('T')[0])
  }, [showDDayModal]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Phone Modal ─────────────────────────────────────────────────── */
  const [showPhoneModal, setShowPhoneModal] = useState(false)

  /* ── Access Code Popup ───────────────────────────────────────────── */
  const [showCodePopup, setShowCodePopup]       = useState(false)
  const [codeInput, setCodeInput]               = useState('')
  const [codeError, setCodeError]               = useState<string | null>(null)
  const [codeSubmitting, setCodeSubmitting]     = useState(false)
  const [_accessCodeUsed, setAccessCodeUsed]     = useState<string | null>(null)
  // ── 2026-06-15 수정: 이용코드 만료일 state 추가 ──
  const [_codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null)
  // ── 2026-06-24 추가 (P0-9): 코드 입력 결과 안내 팝업 ──
  const [codeResult, setCodeResult] = useState<CodeResultData | null>(null)

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
        const HEALTH_COURSE_IDS: Record<string, string> = {
          '7dec5e5f-35fa-406c-97db-723eb0d84fdf': '건강·체력평가',
          '07b01337-b77e-4073-bde5-ca7d9a485b61': '기능해부학',
          'cc3ae50d-3dda-4a4d-9aaf-1b0e83907ce6': '병태생리학',
          '92f36a3a-6ea3-4753-b1ff-360a3db5c245': '스포츠심리학',
          '61c77ae0-3d4c-4e68-b3e6-31a0bacf13aa': '운동부하검사',
          '12f7e736-17df-4630-983f-af991ef45506': '운동상해',
          'c66591ba-8085-4d66-9a8e-bd6728bbc58b': '운동생리학',
          '47b3aca5-1c9a-4543-82ef-bba905d2bf0f': '운동처방론',
        }
        const allCourseIds = [
          ...Object.values(BODYBUILD_COURSES),
          ...Object.keys(HEALTH_COURSE_IDS),
        ]
        const { data } = await supabase
          .from('chapter_cards')
          .select('star_rating, chapters!inner(course_id)')
          .in('chapters.course_id', allCourseIds)
          .in('star_rating', [4, 5])
        if (!data) return
        const acc: Record<string, { fire: number; star: number }> = {}
        for (const row of data) {
          const chapter = row.chapters as unknown as { course_id: string } | null
          if (!chapter) continue
          const subjectName =
            Object.entries(BODYBUILD_COURSES).find(([, id]) => id === chapter.course_id)?.[0]
            ?? HEALTH_COURSE_IDS[chapter.course_id]
          if (!subjectName) continue
          if (!acc[subjectName]) acc[subjectName] = { fire: 0, star: 0 }
          if (row.star_rating === 5) acc[subjectName].fire += 1
          else if (row.star_rating === 4) acc[subjectName].star += 1
        }
        console.log('[starStats keys]', Object.keys(acc))
        setSubjectStarStats(acc)
      } catch { /* ignore */ }
    }
    fetchSubjectStarStats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === 'classroom' && !classroomLoaded) loadClassroom()
  }, [tab, classroomLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

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

    // cert_id(slug) → certifications.id(uuid) 매핑 로드 (chapter_stats.certification_id 용).
    // 다른 로딩과 무관하므로 블로킹하지 않고 병렬로 진행
    supabase.from('certifications').select('id, slug').then(({ data }) => {
      if (!data) return
      const map: Record<string, string> = {}
      for (const c of data) map[c.slug] = c.id
      setCertSlugToId(map)
    })

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
          ? fetch(`/api/v1/report?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' })
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
    // ── 2026-06-15 수정: 만료일 초기화 ──
    if (pm.codeExpiresAt) setCodeExpiresAt(String(pm.codeExpiresAt))
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

    // ② profile-settings 조회 (exam_target_date 등 학습 설정 — profiles 단일 소스)
    const [psRes] = await Promise.allSettled([
      fetch(`/api/v1/profile-settings?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' }),
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

    // ③ localStorage 폴백 — 모든 DB 조회 실패 시 마지막 안전망
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
      console.log('[main cards]', cards.map((c: { name: string; subjectId: string | null }) => c.name))
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
            // ── 2026-06-12 수정: 완료 기준을 lesson_completed === true로 단순화 (점수 무관) ──
            const completedSet = new Set(
              stats.filter((s) => s.lesson_completed === true)
                   .map((s) => s.chapter_id)
            )
            // ── 기존 코드 (점수 80점 미만 시 완료 미반영 이슈) ──
            // const completedSet = new Set(
            //   stats.filter((s) => s.lesson_completed === true || (s.latest_score ?? s.avg_score) >= 80)
            //        .map((s) => s.chapter_id)
            // )
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

            // ── 기존 코드 (allChaps 재사용 — 보디빌딩 course_id 미포함으로 항상 skip됨) ──
            // for (const [name, courseId] of Object.entries(BODYBUILD_COURSES)) {
            //   const chaps = (allChaps ?? []).filter((c) => c.course_id === courseId)
            //   if (chaps.length === 0) continue
            //   progressMap[name] = {
            //     total: chaps.length,
            //     completed: chaps.filter((c) => completedSet.has(c.id)).length,
            //   }
            // }

            // ── 2026-06-12 수정: 보디빌딩 chapters 별도 fetch (allCourseIds에 미포함) ──
            const { data: bdChaps } = await supabase
              .from('chapters').select('id, course_id')
              .in('course_id', Object.values(BODYBUILD_COURSES))
            for (const [name, courseId] of Object.entries(BODYBUILD_COURSES)) {
              const chaps = (bdChaps ?? []).filter((c) => c.course_id === courseId)
              if (chaps.length === 0) continue
              progressMap[name] = {
                total: chaps.length,
                completed: chaps.filter((c) => completedSet.has(c.id)).length,
              }
              console.log('[bd progress]', name, 'total:', chaps.length, 'completed:', chaps.filter(c => completedSet.has(c.id)).length)
            }

            console.log('[main progressMap keys]', Object.keys(progressMap))
            setSubjectProgress(progressMap)

            // 자격증별 진도율 분리 계산 (같은 subject를 여러 자격증이 공유하는 경우 대비 —
            // 예: IIPA Lv1/Lv2). course_certifications에 매핑이 등록된 자격증만 실제로
            // course를 좁히고, 등록이 없는(미등록) 자격증은 기존처럼 subject 전체를 사용
            try {
              const activeCerts = (certsData.data ?? []).filter((c) => c.is_active !== false)
              if (activeCerts.length > 0) {
                const { data: certRows } = await supabase.from('certifications').select('id, slug')
                const slugToId: Record<string, string> = {}
                for (const c of (certRows ?? [])) slugToId[c.slug] = c.id

                const certUuids = Array.from(new Set(
                  activeCerts.map((c) => slugToId[c.cert_id]).filter((id): id is string => !!id)
                ))

                if (certUuids.length > 0) {
                  const { data: ccRows } = await supabase
                    .from('course_certifications')
                    .select('course_id, certification_id')
                    .in('certification_id', certUuids)
                    .in('course_id', allCourseIds)

                  const mappedCourseIdsByCert: Record<string, Set<string>> = {}
                  for (const row of (ccRows ?? [])) {
                    if (!mappedCourseIdsByCert[row.certification_id]) mappedCourseIdsByCert[row.certification_id] = new Set()
                    mappedCourseIdsByCert[row.certification_id].add(row.course_id)
                  }

                  const progressByCertMap: Record<string, { total: number; completed: number }> = {}
                  for (const uc of activeCerts) {
                    const certUuid = slugToId[uc.cert_id]
                    if (!certUuid) continue
                    const mappedSet = mappedCourseIdsByCert[certUuid]
                    for (const subjName of uc.subjects ?? []) {
                      const card = cards.find((c) => c.name === subjName)
                      if (!card?.subjectId) continue
                      const fullCourseIds = (allCourses ?? [])
                        .filter((c) => c.subject_id === card.subjectId)
                        .map((c) => c.id)
                      // 이 subject의 course 중 해당 자격증에 매핑된 게 하나라도 있을 때만 좁힘 —
                      // 없으면(이 subject는 이 자격증의 매핑 대상이 아님) 전체 사용
                      const intersected = mappedSet ? fullCourseIds.filter((id) => mappedSet.has(id)) : []
                      const courseIds = intersected.length > 0 ? intersected : fullCourseIds
                      const chaps = (allChaps ?? []).filter((c) => courseIds.includes(c.course_id))
                      progressByCertMap[`${certUuid}::${subjName}`] = {
                        total: chaps.length,
                        completed: chaps.filter((c) => completedSet.has(c.id)).length,
                      }
                    }
                  }
                  console.log('[main progressByCertMap keys]', Object.keys(progressByCertMap))
                  setSubjectProgressByCert(progressByCertMap)
                }
              }
            } catch { /* ignore */ }
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
    console.log('[loadClassroom early return]', classroomLoaded)
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
    // ── 2026-06-13 수정: userCerts가 이미 로드된 경우 재fetch 생략 ──
    if (uid && userCerts.length === 0) {
      try {
        const ucRes  = await fetch(`/api/v1/user-certifications?userId=${uid}`)
        const ucData = await ucRes.json()
        if (Array.isArray(ucData.data) && ucData.data.length > 0) {
          setUserCerts(ucData.data as UserCertification[])
        }
      } catch { /* ignore */ }
    }
    // ── 기존 코드 (항상 재fetch — handleOrderSave 저장 결과 덮어씀) ──
    // if (uid) {
    //   try {
    //     const ucRes  = await fetch(`/api/v1/user-certifications?userId=${uid}`)
    //     const ucData = await ucRes.json()
    //     if (Array.isArray(ucData.data) && ucData.data.length > 0) {
    //       setUserCerts(ucData.data as UserCertification[])
    //     }
    //   } catch { /* ignore */ }
    // }

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
          console.log('[fallback 진입]', names, dbSubjs)
          setSubjectCards(names.map((name) => {
            const meta = SUBJECT_META[name] ?? { icon: '📚', desc: '' }
            const db   = (dbSubjs ?? []).find((d: { id: string; name: string }) => d.name === name)
            return { name, icon: meta.icon, desc: meta.desc, subjectId: db?.id ?? null }
          }))

          // fallback 경로 progressMap 계산
          try {
            const fallbackCards = names.map((name: string) => {
              const subj = (dbSubjs ?? []).find((s: { name: string; id: string }) => s.name === name)
              return { name, subjectId: subj?.id ?? null }
            })
            const fallbackSubjectIds = fallbackCards
              .map((c: { subjectId: string | null }) => c.subjectId)
              .filter(Boolean) as string[]

            if (fallbackSubjectIds.length > 0) {
              const { data: fbCourses } = await supabase
                .from('courses')
                .select('id, subject_id')
                .in('subject_id', fallbackSubjectIds)

              const fbCourseIds = (fbCourses ?? []).map((c: { id: string }) => c.id)

              if (fbCourseIds.length > 0) {
                const { data: fbChaps } = await supabase
                  .from('chapters')
                  .select('id, course_id')
                  .in('course_id', fbCourseIds)

                const currentStats = allStats ?? recentStats ?? []
                const completedSet = new Set(
                  currentStats
                    .filter((s) => s.lesson_completed === true || (s.latest_score ?? s.avg_score) >= 80)
                    .map((s) => s.chapter_id)
                )

                const fbProgressMap: Record<string, { total: number; completed: number }> = {}
                for (const card of fallbackCards) {
                  if (!card.subjectId) continue
                  const courseIds = (fbCourses ?? [])
                    .filter((c: { subject_id: string }) => c.subject_id === card.subjectId)
                    .map((c: { id: string }) => c.id)
                  const chaps = (fbChaps ?? []).filter((c: { course_id: string }) => courseIds.includes(c.course_id))
                  fbProgressMap[card.name] = {
                    total: chaps.length,
                    completed: chaps.filter((c: { id: string }) => completedSet.has(c.id)).length,
                  }
                }

                // BODYBUILD_COURSES 별도 진행률 추가
                const { data: bdChaps } = await supabase
                  .from('chapters')
                  .select('id, course_id')
                  .in('course_id', Object.values(BODYBUILD_COURSES))

                for (const [name, courseId] of Object.entries(BODYBUILD_COURSES)) {
                  const chaps = (bdChaps ?? []).filter((c: { course_id: string }) => c.course_id === courseId)
                  if (chaps.length === 0) continue
                  fbProgressMap[name] = {
                    total: chaps.length,
                    completed: chaps.filter((c: { id: string }) => completedSet.has(c.id)).length,
                  }
                }

                console.log('[fallback progressMap keys]', Object.keys(fbProgressMap))
                setSubjectProgress(fbProgressMap)

                // 자격증별 진도율 분리 계산 (메인 경로와 동일한 로직 — fallback 경로는
                // userCerts state 타이밍을 신뢰할 수 없어 독립적으로 재fetch)
                try {
                  const ucRes  = await fetch(`/api/v1/user-certifications?userId=${uid}`)
                  const ucData = await ucRes.json()
                  const activeCerts: UserCertification[] = Array.isArray(ucData.data)
                    ? ucData.data.filter((c: UserCertification) => c.is_active !== false)
                    : []

                  if (activeCerts.length > 0) {
                    const { data: certRows } = await supabase.from('certifications').select('id, slug')
                    const slugToId: Record<string, string> = {}
                    for (const c of (certRows ?? [])) slugToId[c.slug] = c.id

                    const certUuids = Array.from(new Set(
                      activeCerts.map((c) => slugToId[c.cert_id]).filter((id): id is string => !!id)
                    ))

                    if (certUuids.length > 0) {
                      const { data: ccRows } = await supabase
                        .from('course_certifications')
                        .select('course_id, certification_id')
                        .in('certification_id', certUuids)
                        .in('course_id', fbCourseIds)

                      const mappedCourseIdsByCert: Record<string, Set<string>> = {}
                      for (const row of (ccRows ?? [])) {
                        if (!mappedCourseIdsByCert[row.certification_id]) mappedCourseIdsByCert[row.certification_id] = new Set()
                        mappedCourseIdsByCert[row.certification_id].add(row.course_id)
                      }

                      const fbProgressByCertMap: Record<string, { total: number; completed: number }> = {}
                      for (const uc of activeCerts) {
                        const certUuid = slugToId[uc.cert_id]
                        if (!certUuid) continue
                        const mappedSet = mappedCourseIdsByCert[certUuid]
                        for (const subjName of uc.subjects ?? []) {
                          const card = fallbackCards.find((c: { name: string }) => c.name === subjName)
                          if (!card?.subjectId) continue
                          const fullCourseIds = (fbCourses ?? [])
                            .filter((c: { subject_id: string }) => c.subject_id === card.subjectId)
                            .map((c: { id: string }) => c.id)
                          const intersected = mappedSet ? fullCourseIds.filter((id: string) => mappedSet.has(id)) : []
                          const courseIds = intersected.length > 0 ? intersected : fullCourseIds
                          const chaps = (fbChaps ?? []).filter((c: { course_id: string }) => courseIds.includes(c.course_id))
                          fbProgressByCertMap[`${certUuid}::${subjName}`] = {
                            total: chaps.length,
                            completed: chaps.filter((c: { id: string }) => completedSet.has(c.id)).length,
                          }
                        }
                      }
                      console.log('[fallback progressByCertMap keys]', Object.keys(fbProgressByCertMap))
                      setSubjectProgressByCert(fbProgressByCertMap)
                    }
                  }
                } catch { /* ignore */ }
              }
            }
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    }

    console.log('[loadClassroom 본 실행]')
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
      // ── 2026-06-24 (P0-9): 활성 코드 동기화 + 결과 안내 팝업 ──
      if (data.activeCode) {
        setAccessCodeUsed(data.activeCode.code)
        setCodeExpiresAt(data.activeCode.expiresAt ?? null)
      }
      setCodeResult(data as CodeResultData)
      setShowCodePopup(false)
      setCodeInput('')
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

      // profiles.exam_target_date + cert_type 저장 (단일 소스) → 대시보드 상단 D-Day 즉시 반영
      const res = await fetch('/api/v1/profile-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, exam_target_date: ddayNewDate, cert_type: ddayNewCert }),
      })

      if (!res.ok) {
        setToastMessage('D-Day 저장에 실패했습니다. 다시 시도해주세요.')
        setShowToast(true)
        setTimeout(() => setShowToast(false), 2500)
        setSavingDDay(false)
        return
      }

      setProfileExamDate(ddayNewDate)
      setProfileCert(ddayNewCert)
      setExamDateInput(ddayNewDate)   // 내 정보 탭도 동기화
      // localStorage 백업 — 재로그인 후 DB 조회 전 즉시 복원용
      localStorage.setItem('kinepia_exam_date', ddayNewDate)
      if (ddayNewCert) localStorage.setItem('kinepia_cert_type', ddayNewCert)

      setDdayNewDate('')
      setShowDDayModal(false)         // 모달 자동 닫힘
      setToastMessage('D-Day가 저장되었습니다.')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2500)
    } catch {
      setToastMessage('네트워크 오류로 D-Day를 저장하지 못했습니다.')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2500)
    }
    setSavingDDay(false)
  }

  const handleClearDDay = async () => {
    const userId = session?.user?.id ?? ''
    const prevExamDate = profileExamDate
    setProfileExamDate(null)
    setExamDateInput('')
    try {
      const res = await fetch('/api/v1/profile-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, exam_target_date: null }),
      })
      if (!res.ok) {
        // 롤백 + 실패 알림
        setProfileExamDate(prevExamDate)
        setExamDateInput(prevExamDate ?? '')
        setToastMessage('D-Day 초기화에 실패했습니다. 다시 시도해주세요.')
        setShowToast(true)
        setTimeout(() => setShowToast(false), 2500)
        return
      }
      localStorage.removeItem('kinepia_exam_date')
    } catch {
      setProfileExamDate(prevExamDate)
      setExamDateInput(prevExamDate ?? '')
      setToastMessage('네트워크 오류로 D-Day를 초기화하지 못했습니다.')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2500)
    }
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

  // ── 2026-06-13 수정: 클라이언트 supabase → API route PUT으로 교체 (RLS 우회) ──
  const handleOrderSave = async () => {
    try {
      localStorage.setItem('kinepia_subject_order', JSON.stringify(subjectOrderByCert))
      const res = await fetch('/api/v1/user-certifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certOrder, subjectOrders: subjectOrderByCert }),
      })
      if (!res.ok) throw new Error('Update failed')
      // ── 2026-06-13 수정: 배열 순서 + order_index 값 모두 갱신 ──
      // ── 2026-06-24 수정: subjects 순서도 로컬 동기화 (DB 반영분 미러링) ──
      setUserCerts(prev =>
        prev.map(cert => ({
          ...cert,
          order_index: certOrder.indexOf(cert.cert_id),
          subjects: subjectOrderByCert[cert.cert_id] ?? cert.subjects,
        }))
      )
      // ── 기존 코드 (배열 순서만 변경 — order_index 값 미갱신) ──
      // setUserCerts(prev =>
      //   [...prev].sort((a, b) => {
      //     const aIdx = certOrder.indexOf(a.cert_id)
      //     const bIdx = certOrder.indexOf(b.cert_id)
      //     return aIdx - bIdx
      //   })
      // )
      setToastMessage('학습 순서가 저장되었습니다.')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2500)
    } catch {
      setToastMessage('저장에 실패했습니다. 다시 시도해주세요.')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2500)
    }
  }
  // ── 기존 코드 (클라이언트 supabase 직접 호출 — RLS 차단) ──
  // const updates = certOrder.map((certId, idx) =>
  //   supabase.from('user_certifications').update({ order_index: idx })
  //   .eq('cert_id', certId).eq('user_id', session?.user?.id ?? '')
  // )
  // await Promise.all(updates)

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

  // DashboardModals로 이동, 분리 완료 후 일괄 제거 예정
  const _EXAM_DATES = [
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

  // ══════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ══════════════════════════════════════════════════════════════════
  const ctxValue: DashboardContextType = {
    session, router,
    tab, setTab, showLoginPrompt, setShowLoginPrompt, loading, setLoading,
    certLabel, setCertLabel, certKey, setCertKey, subjects, setSubjects,
    style, setStyle, styleType, setStyleType, setUserName,
    profileName, setProfileName, profileAvatar, setProfileAvatar,
    avatarError, setAvatarError, showLogoutModal, setShowLogoutModal,
    profileCert, setProfileCert, profileExamDate, setProfileExamDate, streak, setStreak,
    studiedToday, setStudiedToday, recentActivity, setRecentActivity,
    heartedVideos, setHeartedVideos, subjectCards, setSubjectCards,
    recentStats, setRecentStats, allStats, setAllStats,
    chapterSubjectMap, setChapterSubjectMap, playingIdx, setPlayingIdx, videoRefs,
    showDDayModal, setShowDDayModal,
    ddayNewCert, setDdayNewCert, ddayNewDate, setDdayNewDate, savingDDay, setSavingDDay,
    todayChapter, setTodayChapter, todayChapterState, setTodayChapterState,
    bookmarks, setBookmarks, classroomLoaded, setClassroomLoaded,
    expandedCertId, setExpandedCertId, certOpen, setCertOpen,
    methodOpen, setMethodOpen, activityOpen, setActivityOpen,
    certOrder, setCertOrder, subjectOrderByCert, setSubjectOrderByCert,
    subjectProgress, setSubjectProgress, subjectProgressByCert, userCerts, setUserCerts, certSlugToId,
    selectedExamCert, setSelectedExamCert, oralRegs, setOralRegs,
    oralLoading, setOralLoading, showOralDatePicker, setShowOralDatePicker,
    oralPickerTarget, setOralPickerTarget, oralPickerDate, setOralPickerDate,
    showOralTicket, setShowOralTicket, showOralTimeError, setShowOralTimeError,
    showOralNoReg, setShowOralNoReg, oralSubmitting, setOralSubmitting,
    healthCertSubjects, setHealthCertSubjects,
    examRound, setExamRound, showSubjectConfirmModal, setShowSubjectConfirmModal,
    showRegisteredModal, setShowRegisteredModal, showExamInfoModal, setShowExamInfoModal,
    showExamClosedModal, setShowExamClosedModal, showExamNotYetModal, setShowExamNotYetModal,
    calYear, setCalYear, calMonth, setCalMonth, calTouchStartX, surveyCompletedRef,
    registeredRounds, setRegisteredRounds,
    showPhoneModal, setShowPhoneModal,
    showCodePopup, setShowCodePopup, codeInput, setCodeInput, codeError, setCodeError,
    codeSubmitting, setCodeSubmitting, _accessCodeUsed, setAccessCodeUsed,
    _codeExpiresAt, setCodeExpiresAt,
    codeResult, setCodeResult,
    profileLearningStyle, setProfileLearningStyle,
    dbRequiredNames, setDbRequiredNames, dbGoalSubjects, setDbGoalSubjects,
    examDateInput, setExamDateInput, certTypeInput, setCertTypeInput,
    regionInput, setRegionInput, dailyHoursInput, setDailyHoursInput,
    studyTimeInput, setStudyTimeInput, studyCountInput, setStudyCountInput,
    studyTimeSlotInput, setStudyTimeSlotInput, _pushEnabled, _setPushEnabled,
    savingProfile, setSavingProfile,
    subjectStarStats, setSubjectStarStats, showSurveyPopup, setShowSurveyPopup,
    hasShownSurveyThisSession, setHasShownSurveyThisSession,
    surveyStep, setSurveyStep, surveyQ1, setSurveyQ1, surveyQ2, setSurveyQ2,
    surveyQ1Temp, setSurveyQ1Temp, surveyQ2Temp, setSurveyQ2Temp,
    surveyStars, setSurveyStars, surveyText, setSurveyText,
    surveyFeedback, setSurveyFeedback, surveyConsent, setSurveyConsent,
    surveyLoading, setSurveyLoading, surveyDone, setSurveyDone,
    showToast, setShowToast, toastMessage, setToastMessage,
    initCommon, loadClassroom, _handleHeartVideo, handleVideoTap,
    dismissCodePopup, handleCodeSubmit, handleAddDDayGoal, handleClearDDay,
    moveCert, moveSubject, handleOrderSave, handleSurveySubmit, handleSaveProfile,
    _handleTogglePush, moveCalMonth,
  }

  return (
    <DashboardProvider value={ctxValue}>
    <div className="bg-[#F5F5F3] flex flex-col" style={{ height: '100dvh', maxHeight: '100dvh' }}>
      <div className="flex-1 overflow-hidden pb-16">
        {tab === 'home'      && <HomeTab />}
        {tab === 'classroom' && <ClassroomTab />}
        {tab === 'exam'      && <ExamTab />}
        {tab === 'profile'   && <ProfileTab />}
      </div>


      <BottomTabBar />

      <DashboardModals />
    </div>
    </DashboardProvider>
  )
}
