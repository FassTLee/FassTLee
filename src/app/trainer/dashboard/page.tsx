'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ChevronRight, Plus, Heart,
  Calendar, Clock, MapPin, X, Trash2, Bell,
} from 'lucide-react'
import BottomTabBar from '@/components/common/BottomTabBar'
import PhoneRegisterModal from '@/components/PhoneRegisterModal'

type Tab = 'home' | 'classroom' | 'exam' | 'profile'

const SUBJECTS_KEY = 'kinepia_selected_subjects'
const CERT_KEY     = 'kinepia_selected_cert'
const STYLE_KEY    = 'kinepia_learning_style'

const CERT_LABELS: Record<string, string> = {
  'health-exercise-manager': '건강운동관리사',
  'sports-instructor-2':     '2급 생활스포츠지도사',
  'sports-instructor':       '생활스포츠지도사',
}

const CERT_ICONS: Record<string, string> = {
  '건강운동관리사':       '🏋️',
  '2급 생활스포츠지도사': '🏅',
  '생활스포츠지도사':     '🎽',
}

// 자격증별 필수/선택 과목 구분
const REQUIRED_SUBJECTS: Record<string, string[]> = {
  'health-exercise-manager': [
    '운동생리학', '기능해부학', '건강·체력평가', '운동처방론',
    '운동부하검사', '운동상해', '병태생리학', '스포츠심리학',
  ],
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

const SAMPLE_VIDEOS = [
  { src: '/videos/shorts/shorts-demo-01.mp4', title: '추천 영상 1' },
  { src: '/videos/shorts/shorts-demo-02.mp4', title: '추천 영상 2' },
  { src: '/videos/shorts/shorts-demo-03.mp4', title: '추천 영상 3' },
  { src: '/videos/shorts/shorts-demo-04.mp4', title: '추천 영상 4' },
]

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
}

interface DayGoal {
  id: string
  cert_type: string
  exam_date: string
}

interface TodayChapter {
  chapterId: string
  title: string
  subjectName: string
  subjectId: string
  total: number
  completed: number
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
  const searchParams = useSearchParams()
  const tabParam = (searchParams.get('tab') ?? 'home') as Tab

  const [tab, setTab] = useState<Tab>(tabParam)

  /* Sync tab when URL search param changes (BottomTabBar navigation) */
  useEffect(() => {
    setTab(tabParam)
  }, [tabParam])
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
  const [profileCert, setProfileCert]       = useState<string | null>(null)
  const [profileExamDate, setProfileExamDate] = useState<string | null>(null)
  const [streak, setStreak]                 = useState(0)

  /* ── Home ────────────────────────────────────────────────────────── */
  const [studiedToday, setStudiedToday]   = useState(false)
  const [_recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
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

  /* ── Classroom (lazy) ────────────────────────────────────────────── */
  const [bookmarks, setBookmarks]             = useState<VideoBookmark[]>([])
  const [classroomLoaded, setClassroomLoaded] = useState(false)
  const [classroomCertOpen, setClassroomCertOpen]   = useState(true)
  const [profileSubjectsOpen, setProfileSubjectsOpen] = useState(false)
  const [subjectProgress, setSubjectProgress] = useState<Record<string, { total: number; completed: number }>>({})


  /* ── Exam registration modal ────────────────────────────────────── */
  const [showExamModal, setShowExamModal]   = useState(false)
  const [examName, setExamName]             = useState('')
  const [examPhone, setExamPhone]           = useState('')
  const [examEmail, setExamEmail]           = useState('')
  const [examRound, setExamRound]           = useState(1)
  const [examSubmitting, setExamSubmitting] = useState(false)
  const [examDone, setExamDone]             = useState(false)

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

  // 모달 열릴 때 프로필 자동 채우기 (서버 API 경유 → RLS 우회)
  useEffect(() => {
    if (!showExamModal) return
    fetch('/api/v1/profile-me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        console.log('[examModal] profile-me 결과:', data)
        if (data?.name)  setExamName(data.name)
        if (data?.email) setExamEmail(data.email)
      })
      .catch((e) => console.log('[examModal] profile-me 오류:', e))
  }, [showExamModal]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Phone Modal ─────────────────────────────────────────────────── */
  const [showPhoneModal, setShowPhoneModal] = useState(false)

  /* ── 학습 유형 검사 팝업 ─────────────────────────────────────────── */
  const [showStylePopup, setShowStylePopup] = useState(false)

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
  const [pushEnabled, setPushEnabled]         = useState(false)
  const [settingsOpen, setSettingsOpen]       = useState(false)
  const [savingProfile, setSavingProfile]     = useState(false)

  // ── Init ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    initCommon()
  }, [status, router]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const initCommon = async () => {
    const cert     = localStorage.getItem(CERT_KEY)
    const subs     = localStorage.getItem(SUBJECTS_KEY)
    const styleVal = localStorage.getItem(STYLE_KEY)

    if (cert)     { setCertKey(cert); setCertLabel(CERT_LABELS[cert] ?? cert) }
    if (styleVal) setStyle(styleVal)
    const styleTypeVal = localStorage.getItem('kinepia_learning_type')
    if (styleTypeVal) setStyleType(styleTypeVal)
    if (session?.user?.name) setUserName(session.user.name.split(' ')[0])

    // ① profile-me (서버사이드 세션 → RLS 우회, exam_date 1차 로드)
    let loadedExamDate: string | null = null
    let loadedCertType: string | null = null
    try {
      const pm = await fetch('/api/v1/profile-me', { cache: 'no-store' }).then((r) => r.json())
      console.log('[initCommon] profile-me:', pm)
      if (pm.name)      setProfileName(pm.name)
      if (pm.avatarUrl) setProfileAvatar(pm.avatarUrl)
      if (pm.certType)  { loadedCertType = pm.certType; setProfileCert(pm.certType); setCertTypeInput(pm.certType) }
      if (pm.examDate)  { loadedExamDate = pm.examDate; setProfileExamDate(pm.examDate); setExamDateInput(pm.examDate) }
      if (pm.learningStyle === null) setShowStylePopup(true)
    } catch (e) { console.warn('[initCommon] profile-me 실패', e) }

    let selectedNames: string[] = []
    if (subs) {
      try { selectedNames = JSON.parse(subs) } catch { /* ignore */ }
    }
    setSubjects(selectedNames)

    // ② profile-settings (userId 기반, exam_date 2차 로드 — profile-me보다 우선)
    const userId = session?.user?.id ?? ''
    try {
      const res  = await fetch(`/api/v1/profile-settings?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' })
      const data = await res.json()
      console.log('[initCommon] profile-settings:', data)
      if (data.exam_date) {
        loadedExamDate = data.exam_date
        setExamDateInput(data.exam_date)
        setProfileExamDate(data.exam_date)
      }
      if (data.cert_type) {
        loadedCertType = data.cert_type
        setCertTypeInput(data.cert_type)
        setProfileCert(data.cert_type)
      }
      if (data.region)            setRegionInput(String(data.region))
      if (data.daily_study_hours) setDailyHoursInput(String(data.daily_study_hours))
      if (data.daily_study_time)  setStudyTimeInput(data.daily_study_time)
      if (data.daily_study_count) setStudyCountInput(data.daily_study_count)
      if (data.study_time_slot)   setStudyTimeSlotInput(data.study_time_slot)
      if (data.push_enabled !== undefined && data.push_enabled !== null)
        setPushEnabled(Boolean(data.push_enabled))
    } catch (e) { console.warn('[initCommon] profile-settings 실패', e) }

    // ③ D-Day goals — user-goals 테이블에서도 exam_date 폴백 확인
    try {
      const res  = await fetch(`/api/v1/user-goals?userId=${encodeURIComponent(userId)}`)
      const data = await res.json()
      const goals: DayGoal[] = data.goals ?? []
      setDdayGoals(goals)
      // profile-me / profile-settings 모두 exam_date 반환 못한 경우 user-goals로 폴백
      if (!loadedExamDate && goals.length > 0) {
        const latest = goals[goals.length - 1]
        console.log('[initCommon] user-goals 폴백 exam_date:', latest.exam_date)
        setProfileExamDate(latest.exam_date)
        setExamDateInput(latest.exam_date)
        if (!loadedCertType && latest.cert_type) {
          setProfileCert(latest.cert_type)
          setCertTypeInput(latest.cert_type)
        }
      }
    } catch (e) { console.warn('[initCommon] user-goals 실패', e) }

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

    // Chapter stats
    let stats: ChapterStat[] = []
    try {
      const res   = await fetch(`/api/v1/report?userId=${encodeURIComponent(userId)}`)
      const data  = await res.json()
      stats = data.chapter_stats ?? []
      setAllStats(stats)

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
          }))
        )
      }
    } catch { /* ignore */ }

    // Subject cards (needed for home + classroom)
    if (selectedNames.length > 0) {
      const { data: dbSubjs } = await supabase
        .from('subjects').select('id, name').in('name', selectedNames)
      const cards: SubjectCard[] = selectedNames.map((name) => {
        const meta = SUBJECT_META[name] ?? { icon: '📚', desc: '' }
        const db   = (dbSubjs ?? []).find((d: { id: string; name: string }) => d.name === name)
        return { name, icon: meta.icon, desc: meta.desc, subjectId: db?.id ?? null }
      })
      setSubjectCards(cards)

      // 과목별 진도율 계산 (강의실 탭용)
      try {
        const subjectIds = cards.filter((c) => c.subjectId).map((c) => c.subjectId!)
        if (subjectIds.length > 0) {
          const { data: allCourses } = await supabase
            .from('courses').select('id, subject_id').in('subject_id', subjectIds)
          const allCourseIds = (allCourses ?? []).map((c) => c.id)
          if (allCourseIds.length > 0) {
            const { data: allChaps } = await supabase
              .from('chapters').select('id, course_id').in('course_id', allCourseIds)
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
          const { data: courses } = await supabase
            .from('courses').select('id').eq('subject_id', firstCard.subjectId)
          const cIds = (courses ?? []).map((c) => c.id)
          if (cIds.length > 0) {
            const { data: chaps } = await supabase
              .from('chapters').select('id, title, order_index').in('course_id', cIds)
            const sortedChaps = (chaps ?? []).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
            const completedIds = new Set(
              (stats ?? []).filter((s) => s.lesson_completed === true || (s.latest_score ?? s.avg_score) >= 80).map((s) => s.chapter_id)
            )
            const total     = sortedChaps.length
            const completed = sortedChaps.filter((c) => completedIds.has(c.id)).length
            const nextChap  = sortedChaps.find((c) => !completedIds.has(c.id)) ?? sortedChaps[0]
            if (nextChap) {
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

    // Phone 등록 여부 확인 → 미등록 + 미dismissal 시 모달 노출
    try {
      const phoneRes  = await fetch('/api/v1/update-phone')
      const phoneData = await phoneRes.json()
      if (!phoneData.registered && !sessionStorage.getItem('phone_modal_dismissed')) {
        setShowPhoneModal(true)
      }
    } catch { /* ignore */ }

    setLoading(false)
  }

  const loadClassroom = async () => {
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

  const handleAddDDayGoal = async () => {
    if (!ddayNewDate || savingDDay) return
    setSavingDDay(true)
    try {
      const userId = session?.user?.id ?? ''

      // user-goals 테이블 저장 (기존)
      const res  = await fetch('/api/v1/user-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, cert_type: ddayNewCert, exam_date: ddayNewDate }),
      })
      const data = await res.json()
      if (data.goal) setDdayGoals((prev) => [...prev, data.goal])

      // profiles.exam_date + cert_type 저장 → 대시보드 상단 D-Day 즉시 반영
      await fetch('/api/v1/profile-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, exam_date: ddayNewDate, cert_type: ddayNewCert }),
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
          body: JSON.stringify({ userId, exam_date: null }),
        })
        setProfileExamDate(null)
        setExamDateInput('')
      }
    } catch { /* ignore */ }
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
          exam_date:         examDateInput    || null,
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
  const handleTogglePush = async (value: boolean) => {
    setPushEnabled(value)
    const userId = session?.user?.id ?? ''
    fetch('/api/v1/profile-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, push_enabled: value }),
    }).catch(() => {})
  }

  const handleExamRegister = async () => {
    if (!examName || !examPhone || examSubmitting) return
    setExamSubmitting(true)
    try {
      await supabase.from('exam_registrations').insert({
        name: examName,
        phone: examPhone,
        email: examEmail || null,
        round: examRound,
      })
      setExamDone(true)
    } catch { /* ignore */ }
    setExamSubmitting(false)
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
    allStats.forEach((s) => {
      if (!s.last_attempt_at) return
      const d = new Date(s.last_attempt_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!studyMap[key]) studyMap[key] = []
      studyMap[key].push(s.avg_score)
    })
    // 그리드 시작: 4주 전 월요일
    const todayDow = (actToday.getDay() + 6) % 7   // Mon=0 … Sun=6
    const gridStart = new Date(actToday)
    gridStart.setDate(actToday.getDate() - todayDow - 28)
    const cellsNeeded = Math.round((actToday.getTime() - gridStart.getTime()) / 86400000) + 1
    const totalCells  = Math.ceil(cellsNeeded / 7) * 7
    const calCells = Array.from({ length: totalCells }, (_, i) => {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      const isFuture = d > actToday
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const scores = studyMap[key] ?? []
      return {
        isFuture,
        isToday: d.getTime() === actToday.getTime(),
        studied: scores.length > 0,
        avgScore: scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
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
    <div className="overflow-y-auto pb-24" style={{ height: 'calc(100dvh - 56px)' }}>

      {/* ── 유저 정보 영역 ──────────────────────────────────────── */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-[#F0F0EE]">
        {/* 아바타 + 이름 */}
        <div className="flex items-center gap-3 mb-4">
          {profileAvatar ? (
            <Image
              src={profileAvatar}
              alt="avatar"
              width={44}
              height={44}
              className="w-11 h-11 rounded-full object-cover flex-shrink-0"
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
          /* ── 오늘의 학습 썸네일 카드 (학습 미완료) ── */
          <button
            onClick={() => router.push(`/lesson/${todayChapter.chapterId}`)}
            className="w-full bg-white border-2 border-[#00A651] rounded-2xl overflow-hidden text-left active:bg-[#F0FFF6]"
          >
            {/* 상단 배너 */}
            <div className="bg-[#00A651] px-4 py-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-white/80 uppercase tracking-wide">학습 시작하기</span>
              <span className="text-[11px] text-white/60">{todayChapter.completed} / {todayChapter.total} 챕터 완료</span>
            </div>
            {/* 본문 */}
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00A651]/10 rounded-xl flex items-center justify-center text-[20px] flex-shrink-0">
                {SUBJECT_META[todayChapter.subjectName]?.icon ?? '📚'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#ADADAD] truncate">{todayChapter.subjectName}</p>
                <p className="text-[14px] font-black text-[#1A1A1A] leading-snug truncate">{todayChapter.title}</p>
                <p className="text-[11px] text-[#00A651] font-semibold mt-0.5">지금 바로 시작하세요 →</p>
              </div>
            </div>
            {/* 진행률 바 */}
            <div className="px-4 pb-3">
              <div className="w-full h-1.5 bg-[#F0F0EE] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00A651] rounded-full transition-all"
                  style={{ width: `${todayChapter.total > 0 ? Math.round((todayChapter.completed / todayChapter.total) * 100) : 0}%` }}
                />
              </div>
            </div>
          </button>
        ) : recentStats.length > 0 ? (
          /* 학습 이력 있음 + 오늘 미학습 → 학습 시작하기 */
          <button
            onClick={() => {
              const first = subjectCards.find((c) => c.subjectId)
              if (first?.subjectId) router.push(`/chapters/${first.subjectId}`)
            }}
            className="w-full bg-[#1A1A1A] text-white rounded-2xl p-4 flex items-center gap-3 active:opacity-90"
          >
            <span className="text-[24px]">📖</span>
            <div className="text-left flex-1">
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
              <p className="text-[15px] font-bold">학습 시작하기</p>
              <p className="text-[11px] text-white/70">강의실에서 과목을 선택해보세요</p>
            </div>
            <ChevronRight size={18} className="text-white/70" />
          </button>
        )}
      </div>

      {/* ③ 추천 영상 — 중앙 85% + 좌우 peek 캐러셀 */}
      <div className="py-2">
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
          {SAMPLE_VIDEOS.map((vid, i) => {
            const isFirst = i === 0
            const isLast  = i === SAMPLE_VIDEOS.length - 1
            return (
              <div
                key={i}
                className="flex-shrink-0 rounded-2xl overflow-hidden bg-[#1A1A1A] relative cursor-pointer"
                style={{
                  width: '85%',
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  /* 9:11 = 9:16 대비 약 31% 높이 축소 */
                  aspectRatio: '9 / 11',
                  marginLeft:  isFirst ? '7.5%' : '10px',
                  marginRight: isLast  ? '7.5%' : 0,
                }}
                onClick={() => handleVideoTap(i)}
              >
                <video
                  ref={(el) => { videoRefs.current[i] = el }}
                  src={vid.src}
                  className="w-full h-full object-cover"
                  playsInline          /* iOS 인라인 재생 */
                  muted                /* 모바일 autoplay 정책 허용 */
                  preload="metadata"
                  loop
                  onLoadedMetadata={(e) => {
                    /* 첫 프레임을 썸네일로 표시 */
                    const v = e.target as HTMLVideoElement
                    v.currentTime = 0.001
                  }}
                />

                {/* 정지 오버레이 — 재생 버튼 + 제목 */}
                {playingIdx !== i && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none">
                    <div className="w-14 h-14 rounded-full bg-[#00A651] flex items-center justify-center shadow-xl">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                        <polygon points="7,3 21,12 7,21" />
                      </svg>
                    </div>
                    <p className="text-white text-[13px] font-bold absolute bottom-4 left-0 right-0 text-center px-4 truncate">
                      {vid.title}
                    </p>
                  </div>
                )}

                {/* 재생 중 — 하단 정보 + 녹색 테두리 */}
                {playingIdx === i && (
                  <>
                    <div className="absolute bottom-0 left-0 right-0 px-4 py-3.5 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                      <p className="text-white text-[13px] font-bold truncate">{vid.title}</p>
                      <p className="text-[#00A651] text-[11px] font-bold mt-0.5">▶ 재생 중</p>
                    </div>
                    <div className="absolute inset-0 rounded-2xl ring-2 ring-[#00A651] pointer-events-none" />
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

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
          {/* 자격증 카드 */}
          {displayCert ? (
            <button
              onClick={() => router.push('/trainer/dashboard?tab=classroom')}
              className="flex-shrink-0 bg-[#1A1A1A] rounded-2xl p-4 text-left active:opacity-90"
              style={{ width: '75%', scrollSnapAlign: 'start', marginLeft: '1rem' }}
            >
              {/* 자격증명 + 아이콘 */}
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

              {/* 전체 진도율 */}
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[11px] text-white/40">전체 진도율</span>
                  <span className="text-[18px] font-black text-[#00A651] leading-none">{overallPct}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00A651] rounded-full transition-all"
                    style={{ width: `${overallPct}%` }}
                  />
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
            onClick={() => router.push('/select-cert')}
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
        </div>
      </div>

      {/* ⑤ 내 학습 활동 내역 */}
      {allStats.length > 0 ? (
        <div className="px-4 py-2 space-y-3 pb-4">
          <p className="text-[12px] font-bold text-[#ADADAD] uppercase tracking-wider">내 학습 활동 내역</p>

          {/* 1. 학습 캘린더 (잔디밭) */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
            {/* 월 + 연속일 헤더 */}
            <div className="flex items-center justify-between mb-1">
              <p className="text-[15px] font-black text-[#1A1A1A]">
                {actToday.getFullYear()}년 {actToday.getMonth() + 1}월
              </p>
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
                  className={`aspect-square rounded-[3px] ${cell.isToday ? 'ring-[1.5px] ring-[#1A1A1A] ring-offset-0' : ''}`}
                  style={{ backgroundColor: getCellColor(cell) }}
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
          {(thisWeekCount > 0 || lastWeekCount > 0) && (
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
                {lastWeekCount > 0 && (
                  <p className={`text-[10px] mt-1 font-semibold ${
                    thisWeekCount >= lastWeekCount ? 'text-[#00A651]' : 'text-[#E24B4A]'
                  }`}>
                    {thisWeekCount >= lastWeekCount ? '↑' : '↓'} {Math.abs(thisWeekCount - lastWeekCount)}챕터 vs 지난주
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
          )}

          {/* 3. 취약 과목 알림 */}
          {weakSubjects.length > 0 && (
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
      ) : subjectCards.length === 0 ? (
        <div className="mx-4 my-2 bg-white rounded-2xl border border-[#E5E5E5] p-8 text-center">
          <div className="text-[40px] mb-3">📚</div>
          <p className="text-[15px] font-bold text-[#1A1A1A] mb-1">아직 학습 이력이 없어요</p>
          <p className="text-[12px] text-[#ADADAD] mb-5">강의실에서 과목을 선택해 학습을 시작해보세요!</p>
          <button
            onClick={() => router.push('/trainer/dashboard?tab=classroom')}
            className="px-5 py-2.5 bg-[#00A651] text-white rounded-xl text-[13px] font-bold"
          >
            강의실 바로가기
          </button>
        </div>
      ) : null}
    </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // ② CLASSROOM TAB
  // ══════════════════════════════════════════════════════════════════
  const renderClassroom = () => {
    const fallbackRequired = REQUIRED_SUBJECTS[certKey] ?? []
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
      <div className="overflow-y-auto p-4 pb-24 space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>
        <div className="pt-8">
          <h2 className="text-[20px] font-black text-[#1A1A1A]">강의실</h2>
        </div>

        {subjects.length === 0 ? (
          /* ── 빈 상태 ── */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-[56px] mb-4">📚</div>
            <p className="text-[16px] font-black text-[#1A1A1A] mb-2">학습할 자격증을 선택해주세요</p>
            <p className="text-[13px] text-[#ADADAD] mb-6">자격증과 과목을 선택하면<br />맞춤 강의가 제공됩니다</p>
            <button
              onClick={() => router.push('/select-cert')}
              className="flex items-center gap-2 px-6 py-3.5 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold"
            >
              <Plus size={18} /> 강의 추가하기
            </button>
          </div>
        ) : (
          <>
            {/* ── 자격증 카드 + 드롭다운 ── */}
            <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
              {/* 자격증 헤더 (클릭 시 드롭다운 토글) */}
              <button
                onClick={() => setClassroomCertOpen((o) => !o)}
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
                <div className={`transition-transform duration-200 ${classroomCertOpen ? 'rotate-90' : ''}`}>
                  <ChevronRight size={16} className="text-[#ADADAD]" />
                </div>
              </button>

              {/* 드롭다운: 과목 목록 */}
              {classroomCertOpen && (
                <div className="border-t border-[#F0F0EE]">
                  {showTypeLabels ? (
                    <>
                      {/* 필수과목 */}
                      {requiredList.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-[#F5F5F3] flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider">필수과목</span>
                            <span className="text-[10px] text-[#ADADAD]">· {requiredList.length}개</span>
                          </div>
                          {requiredList.map((name, idx) => (
                            <SubjectRow
                              key={name}
                              name={name}
                              hasBorder={idx < requiredList.length - 1 || optionalList.length > 0}
                            />
                          ))}
                        </div>
                      )}

                      {/* 선택과목 */}
                      {optionalList.length > 0 && (
                        <div>
                          <div className={`px-4 py-2 bg-[#F5F5F3] flex items-center gap-1.5 ${requiredList.length > 0 ? 'border-t border-[#F0F0EE]' : ''}`}>
                            <span className="text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider">선택과목</span>
                            <span className="text-[10px] text-[#ADADAD]">· {optionalList.length}개</span>
                          </div>
                          {optionalList.map((name, idx) => (
                            <SubjectRow
                              key={name}
                              name={name}
                              hasBorder={idx < optionalList.length - 1}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    /* 자격증 매핑 없는 경우: 구분 없이 전체 표시 */
                    subjects.map((name, idx) => (
                      <SubjectRow
                        key={name}
                        name={name}
                        hasBorder={idx < subjects.length - 1}
                      />
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 강의 추가하기 버튼 */}
            <button
              onClick={() => router.push('/select-cert')}
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

  const renderExam = () => (
    <div className="overflow-y-auto p-4 pb-24 space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>
      <div className="pt-8">
        <p className="text-[12px] text-[#ADADAD]">시험 준비</p>
        <h2 className="text-[18px] font-black text-[#1A1A1A]">2026년 건강운동관리사 모의고사</h2>
      </div>

      {/* 히어로 카드 */}
      {allExamsDone ? (
        /* 모든 모의고사 종료 → 응원 메시지 */
        <div className="bg-[#1A1A1A] rounded-2xl p-5 text-white text-center">
          <div className="text-[36px] mb-2">💪</div>
          <p className="text-[16px] font-black text-white leading-snug">
            시험 당일입니다!
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
          <button
            onClick={() => { setExamRound(nextExam.round); setShowExamModal(true) }}
            className="mt-4 w-full py-3 bg-[#00A651] rounded-xl text-[14px] font-bold text-white"
          >
            신청하기
          </button>
        </div>
      ) : null}

      {/* 시험 형식 안내 */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
        <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-3">모의고사 형식</p>
        <div className="space-y-2.5">
          {[
            { icon: '📝', label: '총 문항',   value: '160문항 (8과목 × 20문항)' },
            { icon: '⏱️', label: '시험 시간',  value: '160분' },
            { icon: '✅', label: '합격 기준',  value: '과목별 40% 이상 + 전체 60% 이상' },
            { icon: '🗓️', label: '시험 방식',  value: '4지선다형 객관식' },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-[16px] flex-shrink-0">{icon}</span>
              <div className="flex-1 flex items-center justify-between">
                <span className="text-[12px] text-[#6B6B6B]">{label}</span>
                <span className="text-[12px] font-semibold text-[#1A1A1A]">{value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 일정 목록 */}
      <div>
        <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">
          <Calendar size={11} className="inline mr-1" />전체 일정
        </p>
        <div className="space-y-2">
          {EXAM_DATES.map((e) => {
            const isNext  = nextExam?.round === e.round
            const isPast  = new Date(e.dateValue) < today
            const dday    = calcDDay(e.dateValue)
            return (
              <div key={e.round} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                isNext ? 'border-[#00A651]/30 bg-[#00A651]/5'
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
                  ) : (
                    <button
                      onClick={() => { setExamRound(e.round); setShowExamModal(true) }}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border ${
                        isNext
                          ? 'bg-[#00A651] border-[#00A651] text-white'
                          : 'bg-[#F5F5F3] border-[#00A651] text-[#6B6B6B]'
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
                <p className="text-[10px] text-[#ADADAD]">실제 시험일</p>
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

  // ══════════════════════════════════════════════════════════════════
  // ⑤ PROFILE TAB
  // ══════════════════════════════════════════════════════════════════
  const renderProfile = () => {
    const currentStyle   = styleType ?? style
    const styleMeta      = currentStyle ? STYLE_META[currentStyle] : null

    // 자격증/과목 섹션용 (DB 우선, 하드코딩 폴백)
    const displayCertName   = certLabel || profileCert || ''
    const fallbackRequiredP = REQUIRED_SUBJECTS[certKey] ?? []
    const effectiveReqP     = dbRequiredNames.length > 0 ? dbRequiredNames : fallbackRequiredP
    const requiredInP       = subjects.filter((s) => effectiveReqP.includes(s))
    const optionalInP       = subjects.filter((s) => !effectiveReqP.includes(s))
    const showSubjectLabels = effectiveReqP.length > 0

    // 학습 목표 섹션용 (DB 우선, 하드코딩 폴백)
    const selectedCertKeyGoal = Object.entries(CERT_LABELS).find(([, v]) => v === certTypeInput)?.[0] ?? ''
    const goalRequiredFromDB  = dbGoalSubjects.filter((s) => s.is_required).map((s) => s.name)
    const goalOptionalFromDB  = dbGoalSubjects.filter((s) => !s.is_required).map((s) => s.name)
    const fallbackGoalSubs    = selectedCertKeyGoal ? (REQUIRED_SUBJECTS[selectedCertKeyGoal] ?? []) : []
    const goalRequiredSubs    = goalRequiredFromDB.length > 0 ? goalRequiredFromDB : fallbackGoalSubs
    const goalOptionalSubs    = goalOptionalFromDB
    const hasGoalSubjects     = goalRequiredSubs.length > 0 || goalOptionalSubs.length > 0
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
      <div className="overflow-y-auto p-4 pb-24 space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>
        <div className="pt-8">
          <h2 className="text-[20px] font-black text-[#1A1A1A]">내 정보</h2>
        </div>

        {/* ── 학습 성향 ── */}
        <div>
          <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">학습 성향</p>
          {styleMeta ? (
            <div className="bg-white rounded-xl border border-[#E5E5E5] px-4 py-4 flex items-center gap-3">
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
              className="w-full bg-white rounded-xl border-2 border-dashed border-[#E5E5E5] px-4 py-4 flex items-center gap-3 active:bg-[#F5F5F3]"
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

        {/* ── 자격증 · 수강 과목 (드롭다운 카드) ── */}
        <div>
          <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">자격증 · 수강 과목</p>
          {displayCertName ? (
            <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
              {/* 자격증 헤더 */}
              <button
                onClick={() => setProfileSubjectsOpen((o) => !o)}
                className="w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-[#F5F5F3]"
              >
                <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[18px] flex-shrink-0">
                  {CERT_ICONS[displayCertName] ?? '🏅'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-black text-[#1A1A1A] truncate">{displayCertName}</p>
                  <p className="text-[11px] text-[#ADADAD]">
                    {subjects.length > 0 ? `${subjects.length}개 과목 수강 중` : '과목을 선택해주세요'}
                  </p>
                </div>
                <div className={`transition-transform duration-200 flex-shrink-0 ${profileSubjectsOpen ? 'rotate-90' : ''}`}>
                  <ChevronRight size={16} className="text-[#ADADAD]" />
                </div>
              </button>

              {/* 드롭다운: 과목 목록 */}
              {profileSubjectsOpen && (
                <div className="border-t border-[#F0F0EE]">
                  {subjects.length === 0 ? (
                    <div className="px-4 py-5 text-center">
                      <p className="text-[13px] text-[#ADADAD] mb-3">아직 선택한 과목이 없어요</p>
                      <button
                        onClick={() => router.push('/select-subject')}
                        className="px-4 py-2 bg-[#00A651] text-white rounded-xl text-[12px] font-bold"
                      >
                        과목 선택하기
                      </button>
                    </div>
                  ) : showSubjectLabels ? (
                    <>
                      {requiredInP.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-[#F5F5F3] flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider">필수과목</span>
                            <span className="text-[10px] text-[#ADADAD]">· {requiredInP.length}개</span>
                          </div>
                          {requiredInP.map((name, idx) => (
                            <SubjectRowP
                              key={name}
                              name={name}
                              hasBorder={idx < requiredInP.length - 1 || optionalInP.length > 0}
                            />
                          ))}
                        </div>
                      )}
                      {optionalInP.length > 0 && (
                        <div>
                          <div className={`px-4 py-2 bg-[#F5F5F3] flex items-center gap-1.5 ${requiredInP.length > 0 ? 'border-t border-[#F0F0EE]' : ''}`}>
                            <span className="text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider">선택과목</span>
                            <span className="text-[10px] text-[#ADADAD]">· {optionalInP.length}개</span>
                          </div>
                          {optionalInP.map((name, idx) => (
                            <SubjectRowP key={name} name={name} hasBorder={idx < optionalInP.length - 1} />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    subjects.map((name, idx) => (
                      <SubjectRowP key={name} name={name} hasBorder={idx < subjects.length - 1} />
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => router.push('/select-cert')}
              className="w-full bg-white rounded-xl border-2 border-dashed border-[#E5E5E5] px-4 py-4 flex items-center gap-3 active:bg-[#F5F5F3]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#F5F5F3] flex items-center justify-center flex-shrink-0">
                <Plus size={20} className="text-[#ADADAD]" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[13px] font-bold text-[#1A1A1A]">자격증 추가하기</p>
                <p className="text-[11px] text-[#ADADAD] mt-0.5">목표 자격증을 선택하세요</p>
              </div>
              <ChevronRight size={16} className="text-[#ADADAD] flex-shrink-0" />
            </button>
          )}
        </div>

        {/* ── 학습 목표 (collapsible, 3단계) ── */}
        <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className="w-full px-4 py-3.5 flex items-center justify-between active:bg-[#F5F5F3]"
          >
            <div className="flex items-center gap-2">
              <span className="text-[15px]">🎯</span>
              <span className="text-[14px] font-bold text-[#1A1A1A]">학습 목표</span>
              {(certTypeInput || examDateInput) && (
                <span className="text-[10px] text-[#00A651] bg-[#00A651]/10 px-1.5 py-0.5 rounded-full font-bold">설정됨</span>
              )}
            </div>
            <div className={`transition-transform duration-200 ${settingsOpen ? 'rotate-90' : ''}`}>
              <ChevronRight size={16} className="text-[#ADADAD]" />
            </div>
          </button>

          {settingsOpen && (
            <div className="border-t border-[#F0F0EE] divide-y divide-[#F0F0EE]">

              {/* 1단계: 목표 자격증 */}
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">1</span>
                  <p className="text-[13px] font-bold text-[#1A1A1A]">목표 자격증</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'health-exercise-manager', label: '건강운동관리사' },
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

              {/* 2단계: 관련 과목 표시 (certTypeInput 기반) */}
              {certTypeInput && hasGoalSubjects && (
                <div className="px-4 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">2</span>
                    <p className="text-[13px] font-bold text-[#1A1A1A]">관련 과목</p>
                  </div>
                  {goalRequiredSubs.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] font-bold text-[#6B6B6B] mb-1.5">필수과목</p>
                      <div className="flex flex-wrap gap-1.5">
                        {goalRequiredSubs.map((s) => (
                          <span key={s} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#00A651]/10 text-[#00A651]">
                            {SUBJECT_META[s]?.icon ?? '📚'} {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {goalOptionalSubs.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-[#6B6B6B] mb-1.5">선택과목</p>
                      <div className="flex flex-wrap gap-1.5">
                        {goalOptionalSubs.map((s) => (
                          <span key={s} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F5A623]/10 text-[#F5A623]">
                            {SUBJECT_META[s]?.icon ?? '📚'} {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3단계: 시험 연도 */}
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">3</span>
                  <p className="text-[13px] font-bold text-[#1A1A1A]">시험 연도</p>
                  {selectedYear && (
                    <span className="text-[10px] text-[#ADADAD]">
                      ({examDateInput ? new Date(examDateInput).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) : ''} 기준)
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {([2026, 2027, 2028] as const).map((year) => (
                    <button
                      key={year}
                      onClick={() => setExamDateInput(CERT_EXAM_DATES[year])}
                      className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border-2 transition-all ${
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
              <div className="px-4 py-4">
                <label className="text-[11px] font-bold text-[#6B6B6B] mb-2.5 flex items-center gap-1.5">
                  <MapPin size={11} /> 지역
                </label>
                <input
                  type="text"
                  placeholder="예: 서울, 부산, 대구..."
                  value={regionInput}
                  onChange={(e) => setRegionInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#1A1A1A] outline-none focus:border-[#00A651]"
                />
              </div>

              {/* 하루 공부 시간 */}
              <div className="px-4 py-4">
                <label className="text-[11px] font-bold text-[#6B6B6B] mb-2.5 flex items-center gap-1.5">
                  <Clock size={11} /> 하루 공부 시간
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
              <div className="px-4 py-4">
                <p className="text-[11px] font-bold text-[#6B6B6B] mb-2.5">하루 공부 횟수</p>
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
              <div className="px-4 py-4">
                <p className="text-[11px] font-bold text-[#6B6B6B] mb-2.5">주요 학습 시간대</p>
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

              {/* 학습 알림 */}
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bell size={15} className="text-[#6B6B6B]" />
                  <div>
                    <p className="text-[13px] font-bold text-[#1A1A1A]">학습 알림</p>
                    <p className="text-[11px] text-[#ADADAD]">공부 리마인더를 받아보세요</p>
                  </div>
                </div>
                <button
                  onClick={() => handleTogglePush(!pushEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${
                    pushEnabled ? 'bg-[#00A651]' : 'bg-[#DADADA]'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
                    pushEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>

              {/* 저장 버튼 */}
              <div className="px-4 py-4">
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
            </div>
          )}
        </div>

        {/* 기타 링크 */}
        <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
          {[
            { label: '리더보드',        path: '/trainer/leaderboard', icon: '🏆' },
            { label: '개인정보 설정',   path: '/settings/privacy',    icon: '🔒' },
            { label: '개인정보처리방침', path: '/privacy',             icon: '📄' },
            { label: '이용약관',        path: '/terms',               icon: '📋' },
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

      {/* ── 모의고사 사전 신청 모달 ── */}
      {showExamModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-black text-[#1A1A1A]">모의고사 사전 신청</h2>
              <button
                onClick={() => { setShowExamModal(false); setExamDone(false); setExamName(''); setExamPhone(''); setExamEmail('') }}
                className="w-8 h-8 flex items-center justify-center text-[#ADADAD]"
              >
                <X size={20} />
              </button>
            </div>

            {examDone ? (
              /* 완료 상태 */
              <div className="text-center py-6 space-y-3">
                <div className="text-[48px]">🎉</div>
                <p className="text-[17px] font-black text-[#1A1A1A]">신청 완료!</p>
                <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
                  {EXAM_DATES.find((e) => e.round === examRound)?.date} {examRound}회차<br />
                  모의고사 신청이 완료되었습니다.
                </p>
                <div className="bg-[#F5F5F3] rounded-2xl p-4 space-y-1.5 text-left mt-2">
                  <p className="text-[11px] font-bold text-[#ADADAD] mb-2">문의</p>
                  <p className="text-[12px] text-[#1A1A1A]">💬 카카오톡 채널: <span className="font-semibold">@Kinepia</span></p>
                  <p className="text-[12px] text-[#1A1A1A]">📧 이메일: <span className="font-semibold">contact@kinepia.io</span></p>
                </div>
                <button
                  onClick={() => { setShowExamModal(false); setExamDone(false); setExamName(''); setExamPhone(''); setExamEmail('') }}
                  className="w-full py-3.5 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold mt-2"
                >
                  확인
                </button>
              </div>
            ) : (
              /* 입력 폼 */
              <>
                {/* 회차 선택 */}
                <div>
                  <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">회차 선택</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {EXAM_DATES.map((e) => (
                      <button
                        key={e.round}
                        onClick={() => setExamRound(e.round)}
                        className={`py-2 rounded-xl text-[11px] font-bold border-2 transition-all ${
                          examRound === e.round
                            ? 'bg-[#00A651] border-[#00A651] text-white'
                            : 'bg-white border-[#E5E5E5] text-[#1A1A1A]'
                        }`}
                      >
                        {e.round}회
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#ADADAD] mt-1.5">
                    {EXAM_DATES.find((e) => e.round === examRound)?.date} 오전 10:00
                  </p>
                </div>

                {/* 이름 */}
                <div>
                  <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">이름 *</p>
                  <input
                    type="text"
                    placeholder="이름을 입력해주세요"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#E5E5E5] text-[14px] text-[#1A1A1A] outline-none focus:border-[#00A651]"
                  />
                </div>

                {/* 연락처 */}
                <div>
                  <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">연락처 *</p>
                  <input
                    type="tel"
                    placeholder="010-0000-0000"
                    value={examPhone}
                    onChange={(e) => setExamPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#E5E5E5] text-[14px] text-[#1A1A1A] outline-none focus:border-[#00A651]"
                  />
                </div>

                {/* 이메일 (선택) */}
                <div>
                  <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">이메일 (선택)</p>
                  <input
                    type="email"
                    placeholder="example@email.com"
                    value={examEmail}
                    onChange={(e) => setExamEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#E5E5E5] text-[14px] text-[#1A1A1A] outline-none focus:border-[#00A651]"
                  />
                </div>

                {/* 제출 버튼 */}
                <button
                  onClick={handleExamRegister}
                  disabled={!examName || !examPhone || examSubmitting}
                  className="w-full py-4 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold disabled:opacity-40"
                >
                  {examSubmitting ? '신청 중...' : '신청하기'}
                </button>

                {/* 푸터 */}
                <div className="text-center space-y-1 pt-1">
                  <p className="text-[11px] text-[#ADADAD]">💬 카카오톡 채널: @Kinepia</p>
                  <p className="text-[11px] text-[#ADADAD]">📧 contact@kinepia.io</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 휴대폰 번호 등록 모달 ── */}
      {showPhoneModal && (
        <PhoneRegisterModal onClose={() => setShowPhoneModal(false)} />
      )}

      {/* ── 학습 유형 검사 팝업 ── */}
      {showStylePopup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-7 text-center">
            <div className="text-[44px] mb-4">🧠</div>
            <h2 className="text-[18px] font-black text-[#1A1A1A] mb-2">학습 유형 분석</h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-6">
              학습 유형을 분석하면<br />
              <span className="text-[#1A1A1A] font-semibold">나에게 맞는 맞춤 학습</span>이 가능합니다
            </p>
            <button
              onClick={() => { setShowStylePopup(false); router.push('/onboarding/style-test') }}
              className="w-full py-4 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold mb-3"
            >
              지금 확인하기
            </button>
            <button
              onClick={() => { setShowStylePopup(false); router.push('/trainer/dashboard') }}
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
                  const diff = Math.ceil((new Date(goal.exam_date).getTime() - Date.now()) / 86400000)
                  return (
                    <div key={goal.id} className="flex items-center gap-3 bg-[#F5F5F3] rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[#1A1A1A] truncate">{goal.cert_type}</p>
                        <p className="text-[11px] text-[#6B6B6B]">
                          {new Date(goal.exam_date).toLocaleDateString('ko-KR')}
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
    </div>
  )
}
