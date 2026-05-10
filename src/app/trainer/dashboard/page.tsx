'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ChevronRight, Plus, Heart,
  RefreshCw, Calendar, Clock, MapPin, X, Trash2,
} from 'lucide-react'
import BottomTabBar from '@/components/common/BottomTabBar'

type Tab = 'home' | 'classroom' | 'exam' | 'profile'

const SUBJECTS_KEY = 'kinepia_selected_subjects'
const CERT_KEY     = 'kinepia_selected_cert'
const STYLE_KEY    = 'kinepia_learning_style'

const CERT_LABELS: Record<string, string> = {
  'health-exercise-manager': '건강운동관리사',
  'sports-instructor-2':     '2급 생활스포츠지도사',
  'sports-instructor':       '생활스포츠지도사',
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
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
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
  const [subjects, setSubjects]   = useState<string[]>([])
  const [style, setStyle]         = useState<string | null>(null)
  const [styleType, setStyleType] = useState<string | null>(null)
  const [_userName, setUserName]  = useState('')

  /* ── Home ────────────────────────────────────────────────────────── */
  const [studiedToday, setStudiedToday]   = useState(false)
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [heartedVideos, setHeartedVideos] = useState<Record<string, boolean>>({})
  const [subjectCards, setSubjectCards]   = useState<SubjectCard[]>([])
  const [recentStats, setRecentStats]     = useState<ChapterStat[]>([])
  const [playingIdx, setPlayingIdx]       = useState<number | null>(null)
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
  const [bookmarks, setBookmarks]           = useState<VideoBookmark[]>([])
  const [classroomLoaded, setClassroomLoaded] = useState(false)


  /* ── Exam registration modal ────────────────────────────────────── */
  const [showExamModal, setShowExamModal]   = useState(false)
  const [examName, setExamName]             = useState('')
  const [examPhone, setExamPhone]           = useState('')
  const [examEmail, setExamEmail]           = useState('')
  const [examRound, setExamRound]           = useState(1)
  const [examSubmitting, setExamSubmitting] = useState(false)
  const [examDone, setExamDone]             = useState(false)

  /* ── Profile ─────────────────────────────────────────────────────── */
  const [examDateInput, setExamDateInput]   = useState('')
  const [regionInput, setRegionInput]       = useState('')
  const [dailyHoursInput, setDailyHoursInput] = useState('')
  const [savingProfile, setSavingProfile]   = useState(false)

  // ── Init ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    initCommon()
  }, [status, router]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === 'classroom' && !classroomLoaded) loadClassroom()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const initCommon = async () => {
    const cert     = localStorage.getItem(CERT_KEY)
    const subs     = localStorage.getItem(SUBJECTS_KEY)
    const styleVal = localStorage.getItem(STYLE_KEY)

    if (cert)     setCertLabel(CERT_LABELS[cert] ?? cert)
    if (styleVal) setStyle(styleVal)
    const styleTypeVal = localStorage.getItem('kinepia_learning_type')
    if (styleTypeVal) setStyleType(styleTypeVal)
    if (session?.user?.name) setUserName(session.user.name.split(' ')[0])

    let selectedNames: string[] = []
    if (subs) {
      try { selectedNames = JSON.parse(subs) } catch { /* ignore */ }
    }
    setSubjects(selectedNames)

    // Profile settings (region / hours)
    try {
      const res  = await fetch('/api/v1/profile-settings')
      const data = await res.json()
      if (data.exam_target_date) {
        setExamDateInput(data.exam_target_date)
      }
      if (data.region)            setRegionInput(String(data.region))
      if (data.daily_study_hours) setDailyHoursInput(String(data.daily_study_hours))
    } catch { /* ignore */ }

    // D-Day goals
    try {
      const res  = await fetch('/api/v1/user-goals')
      const data = await res.json()
      setDdayGoals(data.goals ?? [])
    } catch { /* ignore */ }

    // Chapter stats
    let stats: ChapterStat[] = []
    try {
      const res   = await fetch('/api/v1/report')
      const data  = await res.json()
      stats = data.chapter_stats ?? []

      const sorted = [...stats].sort((a, b) =>
        new Date(b.last_attempt_at ?? 0).getTime() - new Date(a.last_attempt_at ?? 0).getTime()
      )
      setRecentStats(sorted.slice(0, 3))

      // Studied today?
      const today = new Date().toDateString()
      setStudiedToday(sorted.some((s) => s.last_attempt_at && new Date(s.last_attempt_at).toDateString() === today))

      // Recent activity with chapter + subject names (top 5)
      const top5 = sorted.slice(0, 5)
      if (top5.length > 0) {
        const chIds = Array.from(new Set(top5.map((s) => s.chapter_id)))
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
              (stats ?? []).filter((s) => s.avg_score >= 80).map((s) => s.chapter_id)
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

  const handleVideoTap = (idx: number) => {
    const vid = videoRefs.current[idx]
    if (!vid) return
    if (vid.paused) {
      videoRefs.current.forEach((v, i) => { if (v && i !== idx) { v.pause() } })
      vid.play().catch(() => {})
      setPlayingIdx(idx)
    } else {
      vid.pause()
      setPlayingIdx(null)
    }
  }

  const handleAddDDayGoal = async () => {
    if (!ddayNewDate || savingDDay) return
    setSavingDDay(true)
    try {
      const res  = await fetch('/api/v1/user-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cert_type: ddayNewCert, exam_date: ddayNewDate }),
      })
      const data = await res.json()
      if (data.goal) setDdayGoals((prev) => [...prev, data.goal])
      setDdayNewDate('')
    } catch { /* ignore */ }
    setSavingDDay(false)
  }

  const handleDeleteDDayGoal = async (id: string) => {
    setDdayGoals((prev) => prev.filter((g) => g.id !== id))
    try {
      await fetch('/api/v1/user-goals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch { /* ignore */ }
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      await fetch('/api/v1/profile-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_target_date:  examDateInput  || null,
          region:            regionInput    || null,
          daily_study_hours: dailyHoursInput ? parseInt(dailyHoursInput) : null,
        }),
      })
      // exam_target_date는 profile 탭 표시용으로만 유지
    } catch { /* ignore */ }
    setSavingProfile(false)
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
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // ① HOME TAB
  // ══════════════════════════════════════════════════════════════════
  const renderHome = () => (
    <div className="overflow-y-auto pb-24" style={{ height: 'calc(100dvh - 56px)' }}>

      {/* ① D-Day */}
      <div className="px-4 pt-10 pb-2">
        {ddayGoals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E24B4A]/10 rounded-xl flex items-center justify-center text-[20px] flex-shrink-0">
              📅
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-[#1A1A1A]">D-Day를 설정해 보세요</p>
              <p className="text-[11px] text-[#ADADAD]">목표일을 설정하면 학습 계획을 도와드려요</p>
            </div>
            <button
              onClick={() => setShowDDayModal(true)}
              className="text-[12px] font-bold text-[#E24B4A] flex-shrink-0"
            >
              설정하기
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {ddayGoals.map((goal) => {
              const diff = Math.ceil((new Date(goal.exam_date).getTime() - Date.now()) / 86400000)
              return (
                <div key={goal.id} className="bg-[#1A1A1A] rounded-2xl p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/50 mb-0.5 truncate">{goal.cert_type}</p>
                    <p className="text-[13px] font-black text-white">
                      {new Date(goal.exam_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="bg-[#E24B4A] rounded-xl px-4 py-2.5 text-center flex-shrink-0">
                    <p className="text-[10px] text-white/70 font-bold mb-0.5">남은 기간</p>
                    <p className="text-[20px] font-black text-white leading-none">
                      {diff > 0 ? `D-${diff}` : diff === 0 ? 'D-Day' : `D+${Math.abs(diff)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteDDayGoal(goal.id)}
                    className="w-7 h-7 flex items-center justify-center text-white/30 hover:text-white/70 flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
            <button
              onClick={() => setShowDDayModal(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-[#E5E5E5] rounded-2xl text-[12px] text-[#ADADAD]"
            >
              <Plus size={13} /> D-Day 추가
            </button>
          </div>
        )}
      </div>

      {/* ② Daily 학습/테스트 */}
      <div className="px-4 py-2">
        {studiedToday && recentStats.length > 0 ? (
          <div className="bg-[#63992210] border border-[#63992230] rounded-2xl p-4 text-center">
            <p className="text-[16px] font-black text-[#639922]">오늘 학습 완료! 🎉</p>
            <p className="text-[12px] text-[#639922]/70 mt-1">내일도 화이팅이에요</p>
          </div>
        ) : recentStats.length > 0 ? (
          <button
            onClick={() => {
              const first = subjectCards.find((c) => c.subjectId)
              if (first?.subjectId) router.push(`/chapters/${first.subjectId}`)
            }}
            className="w-full bg-[#1A1A1A] text-white rounded-2xl p-4 flex items-center gap-3 active:opacity-90"
          >
            <span className="text-[24px]">✅</span>
            <div className="text-left flex-1">
              <p className="text-[15px] font-bold">테스트 시작하기</p>
              <p className="text-[11px] text-white/50">학습 내용을 점검해보세요</p>
            </div>
            <ChevronRight size={18} className="text-white/50" />
          </button>
        ) : todayChapter ? (
          /* ── 오늘의 학습 썸네일 카드 ── */
          <button
            onClick={() => router.push(`/lesson/${todayChapter.chapterId}`)}
            className="w-full bg-white border-2 border-[#E24B4A] rounded-2xl overflow-hidden text-left active:bg-[#FFF5F5]"
          >
            {/* 상단 배너 */}
            <div className="bg-[#E24B4A] px-4 py-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-white/80 uppercase tracking-wide">오늘의 학습</span>
              <span className="text-[11px] text-white/60">{todayChapter.completed} / {todayChapter.total} 챕터 완료</span>
            </div>
            {/* 본문 */}
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E24B4A]/10 rounded-xl flex items-center justify-center text-[20px] flex-shrink-0">
                {SUBJECT_META[todayChapter.subjectName]?.icon ?? '📚'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#ADADAD] truncate">{todayChapter.subjectName}</p>
                <p className="text-[14px] font-black text-[#1A1A1A] leading-snug truncate">{todayChapter.title}</p>
                <p className="text-[11px] text-[#E24B4A] font-semibold mt-0.5">지금 바로 시작하세요 →</p>
              </div>
            </div>
            {/* 진행률 바 */}
            <div className="px-4 pb-3">
              <div className="w-full h-1.5 bg-[#F0F0EE] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E24B4A] rounded-full transition-all"
                  style={{ width: `${todayChapter.total > 0 ? Math.round((todayChapter.completed / todayChapter.total) * 100) : 0}%` }}
                />
              </div>
            </div>
          </button>
        ) : (
          <button
            onClick={() => router.push('/trainer/dashboard?tab=classroom')}
            className="w-full bg-[#E24B4A] text-white rounded-2xl p-4 flex items-center gap-3 active:opacity-90"
          >
            <span className="text-[24px]">📚</span>
            <div className="text-left flex-1">
              <p className="text-[15px] font-bold">오늘의 학습 시작하기</p>
              <p className="text-[11px] text-white/70">강의실에서 과목을 선택해보세요</p>
            </div>
            <ChevronRight size={18} className="text-white/70" />
          </button>
        )}
      </div>

      {/* ③ 추천 영상 swipe */}
      <div className="py-2">
        <p className="text-[12px] font-bold text-[#ADADAD] uppercase tracking-wider px-4 mb-2">
          오늘의 추천 영상
        </p>
        <div
          className="flex gap-3 px-4 overflow-x-auto pb-2"
          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
        >
          {SAMPLE_VIDEOS.map((vid, i) => (
            <div
              key={i}
              className="flex-shrink-0 rounded-2xl overflow-hidden bg-[#1A1A1A] relative cursor-pointer"
              style={{ width: '52%', scrollSnapAlign: 'start', aspectRatio: '9/16' }}
              onClick={() => handleVideoTap(i)}
            >
              <video
                ref={(el) => { videoRefs.current[i] = el }}
                src={vid.src}
                className="w-full h-full object-cover"
                playsInline
                preload="metadata"
                loop
              />
              {/* 재생 전 오버레이 */}
              {playingIdx !== i && (
                <div className="absolute inset-0 flex flex-col items-end justify-between p-3 bg-gradient-to-b from-black/20 via-transparent to-black/60">
                  <div className="w-10 h-10 rounded-full bg-[#00A651] flex items-center justify-center shadow-lg self-center mt-auto mb-auto">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <polygon points="6,3 20,12 6,21" />
                    </svg>
                  </div>
                  <p className="text-white text-[12px] font-bold w-full text-center">{vid.title}</p>
                </div>
              )}
              {/* 재생 중: 제목 + 녹색 테두리 */}
              {playingIdx === i && (
                <>
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-white text-[12px] font-bold truncate">{vid.title}</p>
                    <p className="text-[#00A651] text-[10px] font-bold mt-0.5">▶ 재생 중</p>
                  </div>
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-[#00A651] pointer-events-none" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ④ 강의실 바로가기 swipe */}
      <div className="py-2">
        <p className="text-[12px] font-bold text-[#ADADAD] uppercase tracking-wider px-4 mb-2">
          강의실 바로가기
        </p>
        {subjectCards.length === 0 ? (
          <div className="mx-4 bg-white rounded-2xl border border-[#E5E5E5] p-6 text-center">
            <p className="text-[13px] text-[#ADADAD] mb-3">등록된 학습이 없습니다</p>
            <button
              onClick={() => router.push('/select-cert')}
              className="text-[13px] font-bold text-[#E24B4A] flex items-center gap-1 mx-auto"
            >
              <Plus size={14} /> 학습 추가하기
            </button>
          </div>
        ) : (
          <div
            className="flex gap-3 px-4 overflow-x-auto pb-2"
            style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
          >
            {subjectCards.map((card, i) => (
              <button
                key={i}
                onClick={() => {
                  if (card.subjectId) {
                    localStorage.setItem('kinepia_current_subject_id', card.subjectId)
                    router.push(`/chapters/${card.subjectId}`)
                  }
                }}
                disabled={!card.subjectId}
                className="flex-shrink-0 bg-white rounded-2xl border border-[#E5E5E5] p-4 text-left active:bg-[#F5F5F3] disabled:opacity-60"
                style={{ width: '75%', scrollSnapAlign: 'start' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-[26px]">{card.icon}</div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[#1A1A1A] truncate">{card.name}</p>
                    <p className="text-[11px] text-[#ADADAD]">{card.desc}</p>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-[#F0F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-[#E24B4A] rounded-full" style={{ width: '0%' }} />
                </div>
                <p className="text-[10px] text-[#ADADAD] mt-1">학습 시작 전</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ⑤ 내 학습 활동 내역 */}
      {recentActivity.length > 0 && (
        <div className="px-4 py-2">
          <p className="text-[12px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">내 학습 활동 내역</p>
          <div className="space-y-2">
            {recentActivity.map((a, i) => (
              <button
                key={i}
                onClick={() => router.push(`/lesson/${a.chapter_id}`)}
                className="w-full bg-white rounded-xl border border-[#E5E5E5] p-3 flex items-center gap-3 text-left active:bg-[#F5F5F3]"
              >
                <div className="w-8 h-8 rounded-lg bg-[#F5F5F3] flex items-center justify-center text-[11px] font-black text-[#ADADAD] flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#1A1A1A] truncate">
                    {a.subject_name ? `${a.subject_name} › ${a.chapter_title}` : a.chapter_title}
                  </p>
                  <p className="text-[10px] text-[#ADADAD]">
                    {a.date ? new Date(a.date).toLocaleDateString('ko-KR') : '-'}
                  </p>
                </div>
                <span className={`text-[12px] font-black flex-shrink-0 ${
                  a.score >= 80 ? 'text-[#639922]' : a.score >= 60 ? 'text-[#378ADD]' : 'text-[#E24B4A]'
                }`}>{a.score}점</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {recentActivity.length === 0 && subjectCards.length === 0 && (
        <div className="mx-4 my-2 bg-white rounded-2xl border border-[#E5E5E5] p-8 text-center">
          <div className="text-[40px] mb-3">📚</div>
          <p className="text-[15px] font-bold text-[#1A1A1A] mb-1">아직 학습 이력이 없어요</p>
          <p className="text-[12px] text-[#ADADAD] mb-5">강의실에서 과목을 선택해 학습을 시작해보세요!</p>
          <button onClick={() => router.push('/trainer/dashboard?tab=classroom')} className="px-5 py-2.5 bg-[#E24B4A] text-white rounded-xl text-[13px] font-bold">
            강의실 바로가기
          </button>
        </div>
      )}
    </div>
  )

  // ══════════════════════════════════════════════════════════════════
  // ② CLASSROOM TAB
  // ══════════════════════════════════════════════════════════════════
  const renderClassroom = () => (
    <div className="overflow-y-auto p-4 pb-24 space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>
      <div className="pt-8">
        <p className="text-[12px] text-[#ADADAD]">{certLabel || 'Kinepia'}</p>
        <h2 className="text-[20px] font-black text-[#1A1A1A]">강의실</h2>
      </div>

      {subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-[56px] mb-4">📚</div>
          <p className="text-[16px] font-black text-[#1A1A1A] mb-2">학습할 강의를 추가해보세요!</p>
          <p className="text-[13px] text-[#ADADAD] mb-6">자격증과 과목을 선택하면<br />맞춤 강의가 제공됩니다</p>
          <button
            onClick={() => router.push('/select-cert')}
            className="flex items-center gap-2 px-6 py-3.5 bg-[#E24B4A] text-white rounded-2xl text-[15px] font-bold"
          >
            <Plus size={18} /> 강의 추가하기
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {subjects.map((name) => {
              const card = subjectCards.find((c) => c.name === name)
              const meta = SUBJECT_META[name] ?? { icon: '📚', desc: '' }
              const sid  = card?.subjectId ?? null
              return (
                <button
                  key={name}
                  onClick={() => {
                    if (sid) {
                      localStorage.setItem('kinepia_current_subject_id', sid)
                      router.push(`/chapters/${sid}`)
                    }
                  }}
                  disabled={!sid}
                  className="w-full bg-white rounded-2xl border border-[#E5E5E5] p-4 text-left flex items-center gap-4 active:bg-[#F5F5F3] disabled:opacity-60 transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#F5F5F3] flex items-center justify-center text-[26px] flex-shrink-0">
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold text-[#1A1A1A] mb-0.5">{name}</div>
                    <div className="text-[11px] text-[#6B6B6B]">{meta.desc}</div>
                  </div>
                  {sid
                    ? <ChevronRight size={16} className="text-[#ADADAD] flex-shrink-0" />
                    : <span className="text-[10px] text-[#ADADAD]">학습 준비중</span>
                  }
                </button>
              )
            })}
          </div>

          <button
            onClick={() => router.push('/select-cert')}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-[#E5E5E5] text-[13px] text-[#ADADAD]"
          >
            <Plus size={16} /> 강의 추가하기
          </button>
        </>
      )}

      {/* Bookmarked videos */}
      {bookmarks.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">찜한 영상</p>
          <div className="space-y-2">
            {bookmarks.map((bm) => (
              <div key={bm.id} className="bg-white rounded-xl border border-[#E5E5E5] p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#E24B4A]/10 flex items-center justify-center text-[18px]">🎬</div>
                <p className="flex-1 text-[13px] font-semibold text-[#1A1A1A] truncate">{bm.video_title || '저장된 영상'}</p>
                <Heart size={15} className="text-[#E24B4A] fill-[#E24B4A] flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ══════════════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════
  // ③ EXAM TAB
  // ══════════════════════════════════════════════════════════════════
  const EXAM_DATES = [
    { round: 1, date: '5월 9일 (토)',  dateValue: '2025-05-09' },
    { round: 2, date: '5월 16일 (토)', dateValue: '2025-05-16' },
    { round: 3, date: '5월 23일 (토)', dateValue: '2025-05-23' },
    { round: 4, date: '5월 30일 (토)', dateValue: '2025-05-30' },
    { round: 5, date: '6월 6일 (토)',  dateValue: '2025-06-06' },
  ]
  const today = new Date()
  const nextExam = EXAM_DATES.find((e) => new Date(e.dateValue) >= today) ?? EXAM_DATES[EXAM_DATES.length - 1]

  const renderExam = () => (
    <div className="overflow-y-auto p-4 pb-24 space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>
      <div className="pt-8">
        <p className="text-[12px] text-[#ADADAD]">시험 준비</p>
        <h2 className="text-[20px] font-black text-[#1A1A1A]">모의고사</h2>
      </div>

      {/* 다음 모의고사 */}
      <div className="bg-[#1A1A1A] rounded-2xl p-5 text-white">
        <p className="text-[11px] text-white/50 uppercase tracking-wider mb-1">다음 모의고사</p>
        <div className="text-[36px] font-black text-[#E24B4A] leading-tight">{nextExam.date}</div>
        <p className="text-[13px] text-white/70 mt-1">{nextExam.round}회차 · 매주 토요일 오전 10:00</p>
        <button
          onClick={() => { setExamRound(nextExam.round); setShowExamModal(true) }}
          className="mt-4 w-full py-3 bg-[#E24B4A] rounded-xl text-[14px] font-bold text-white"
        >
          사전 신청하기
        </button>
      </div>

      {/* 일정 목록 */}
      <div>
        <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">
          <Calendar size={11} className="inline mr-1" />전체 일정
        </p>
        <div className="space-y-2">
          {EXAM_DATES.map((e) => {
            const isNext = e.round === nextExam.round
            return (
              <div key={e.round} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                isNext ? 'border-[#E24B4A]/30 bg-[#E24B4A]/5' : 'border-[#E5E5E5] bg-white'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black ${
                    isNext ? 'bg-[#E24B4A] text-white' : 'bg-[#F5F5F3] text-[#ADADAD]'
                  }`}>{e.round}</div>
                  <div>
                    <p className={`text-[13px] font-bold ${isNext ? 'text-[#E24B4A]' : 'text-[#1A1A1A]'}`}>{e.date}</p>
                    <p className="text-[10px] text-[#ADADAD]">{e.round}회차</p>
                  </div>
                </div>
                {isNext && <span className="text-[10px] font-bold text-[#E24B4A] bg-[#E24B4A]/10 px-2 py-0.5 rounded-full">D-예정</span>}
              </div>
            )
          })}
          {/* 실제 시험일 */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#1A1A1A]/20 bg-[#1A1A1A]/5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black bg-[#1A1A1A] text-white">🎯</div>
              <div>
                <p className="text-[13px] font-bold text-[#1A1A1A]">6월 13일 (토)</p>
                <p className="text-[10px] text-[#ADADAD]">실제 시험일</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#1A1A1A] bg-[#1A1A1A]/10 px-2 py-0.5 rounded-full">실전</span>
          </div>
        </div>
      </div>

      {/* 시험 형식 안내 */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
        <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-3">건강운동관리사 시험 형식</p>
        <div className="space-y-2.5">
          {[
            { icon: '📝', label: '문항 수',   value: '100문항 (과목당 20문항)' },
            { icon: '⏱️', label: '시험 시간',  value: '150분' },
            { icon: '📚', label: '과목 수',   value: '5개 과목 선택' },
            { icon: '✅', label: '합격 기준',  value: '과목별 40점 + 평균 60점 이상' },
            { icon: '🗓️', label: '시험 유형',  value: '4지선다형 객관식' },
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
    </div>
  )

  // ══════════════════════════════════════════════════════════════════
  // ⑤ PROFILE TAB
  // ══════════════════════════════════════════════════════════════════
  const renderProfile = () => (
    <div className="overflow-y-auto p-4 pb-24 space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>
      <div className="pt-8">
        <h2 className="text-[20px] font-black text-[#1A1A1A]">내 정보</h2>
      </div>

      <div>
        <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">학습 성향</p>
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-3 flex items-center gap-3">
          <div className="text-[24px]">
            {(styleType ?? style) === 'conceptualizer' ? '💡'
              : (styleType ?? style) === 'memorizer'   ? '🧠'
              : (styleType ?? style) === 'planner'     ? '📅'
              : (styleType ?? style) === 'intensive'   ? '🔥'
              : '❓'}
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-[#1A1A1A]">
              {(styleType ?? style) === 'conceptualizer' ? '이해형'
                : (styleType ?? style) === 'memorizer'   ? '암기형'
                : (styleType ?? style) === 'planner'     ? '계획형'
                : (styleType ?? style) === 'intensive'   ? '강제형'
                : '미측정'}
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem(STYLE_KEY)
              localStorage.removeItem('kinepia_learning_type')
              router.push('/onboarding/style-test')
            }}
            className="flex items-center gap-1 text-[11px] text-[#E24B4A] font-semibold"
          >
            <RefreshCw size={12} /> 재테스트
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider">자격증 · 수강 과목</p>
          <button onClick={() => router.push('/select-subject')} className="text-[11px] text-[#E24B4A] font-semibold">과목 수정</button>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-3 space-y-2">
          {certLabel && (
            <span className="text-[10px] font-bold text-white bg-[#1A1A1A] px-2 py-0.5 rounded-full inline-block">{certLabel}</span>
          )}
          {subjects.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {subjects.map((name) => (
                <span key={name} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E24B4A]/10 text-[#E24B4A]">{name}</span>
              ))}
            </div>
          ) : (
            <button onClick={() => router.push('/select-cert')} className="w-full text-[13px] text-[#ADADAD] py-1">과목을 선택해주세요 →</button>
          )}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">학습 설정</p>
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-4 space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B6B6B] mb-1.5">
              <Calendar size={12} /> 목표 시험일 (D-Day)
            </label>
            <input
              type="date"
              value={examDateInput}
              onChange={(e) => setExamDateInput(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#1A1A1A] outline-none focus:border-[#E24B4A]"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B6B6B] mb-1.5">
              <MapPin size={12} /> 지역
            </label>
            <input
              type="text"
              placeholder="예: 서울, 부산, 대구..."
              value={regionInput}
              onChange={(e) => setRegionInput(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#1A1A1A] outline-none focus:border-[#E24B4A]"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B6B6B] mb-1.5">
              <Clock size={12} /> 하루 공부 시간
            </label>
            <select
              value={dailyHoursInput}
              onChange={(e) => setDailyHoursInput(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#1A1A1A] outline-none focus:border-[#E24B4A] bg-white"
            >
              <option value="">선택해주세요</option>
              {[1, 2, 3, 4, 5, 6].map((h) => (
                <option key={h} value={h}>{h}시간</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="w-full py-3 bg-[#1A1A1A] text-white rounded-xl text-[13px] font-bold disabled:opacity-40"
          >
            {savingProfile
              ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />저장 중...</span>
              : '설정 저장'
            }
          </button>
        </div>
      </div>

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
                  className="w-full py-3.5 bg-[#E24B4A] text-white rounded-2xl text-[15px] font-bold mt-2"
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
                            ? 'bg-[#E24B4A] border-[#E24B4A] text-white'
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
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#E5E5E5] text-[14px] text-[#1A1A1A] outline-none focus:border-[#E24B4A]"
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
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#E5E5E5] text-[14px] text-[#1A1A1A] outline-none focus:border-[#E24B4A]"
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
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#E5E5E5] text-[14px] text-[#1A1A1A] outline-none focus:border-[#E24B4A]"
                  />
                </div>

                {/* 제출 버튼 */}
                <button
                  onClick={handleExamRegister}
                  disabled={!examName || !examPhone || examSubmitting}
                  className="w-full py-4 bg-[#E24B4A] text-white rounded-2xl text-[15px] font-bold disabled:opacity-40"
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
                          <span className="font-bold text-[#E24B4A]">
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
                        ? 'bg-[#E24B4A] border-[#E24B4A] text-white'
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
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#1A1A1A] outline-none focus:border-[#E24B4A]"
                />
              </div>

              <button
                onClick={handleAddDDayGoal}
                disabled={!ddayNewDate || savingDDay}
                className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[14px] font-bold disabled:opacity-40 flex items-center justify-center gap-2"
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
