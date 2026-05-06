'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ChevronRight, Plus, Heart, Flame, BarChart2,
  Check, RefreshCw, Calendar, Clock, MapPin,
} from 'lucide-react'
import BottomTabBar from '@/components/common/BottomTabBar'

type Tab = 'home' | 'classroom' | 'report' | 'profile'

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

interface QuestionStat {
  question_id: string
  wrong_rate: number
  total_attempts: number
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
  const [_userName, setUserName]  = useState('')

  /* ── Home ────────────────────────────────────────────────────────── */
  const [dDay, setDDay]                   = useState<number | null>(null)
  const [studyDaysSince, setStudyDaysSince] = useState<number>(0)
  const [studiedToday, setStudiedToday]   = useState(false)
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [heartedVideos, setHeartedVideos] = useState<Record<string, boolean>>({})
  const [subjectCards, setSubjectCards]   = useState<SubjectCard[]>([])
  const [recentStats, setRecentStats]     = useState<ChapterStat[]>([])
  const [playingIdx, setPlayingIdx]       = useState<number | null>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  /* ── Classroom (lazy) ────────────────────────────────────────────── */
  const [bookmarks, setBookmarks]           = useState<VideoBookmark[]>([])
  const [classroomLoaded, setClassroomLoaded] = useState(false)

  /* ── Report (lazy) ───────────────────────────────────────────────── */
  const [allChapterStats, setAllChapterStats]   = useState<ChapterStat[]>([])
  const [allQuestionStats, setAllQuestionStats] = useState<QuestionStat[]>([])
  const [reportLoaded, setReportLoaded]         = useState(false)

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
    if (tab === 'report'    && !reportLoaded)    loadReport()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const initCommon = async () => {
    const cert     = localStorage.getItem(CERT_KEY)
    const subs     = localStorage.getItem(SUBJECTS_KEY)
    const styleVal = localStorage.getItem(STYLE_KEY)

    if (cert)     setCertLabel(CERT_LABELS[cert] ?? cert)
    if (styleVal) setStyle(styleVal)
    if (session?.user?.name) setUserName(session.user.name.split(' ')[0])

    let selectedNames: string[] = []
    if (subs) {
      try { selectedNames = JSON.parse(subs) } catch { /* ignore */ }
    }
    setSubjects(selectedNames)

    // Profile settings (D-Day)
    try {
      const res  = await fetch('/api/v1/profile-settings')
      const data = await res.json()
      if (data.exam_target_date) {
        setExamDateInput(data.exam_target_date)
        const diff = Math.ceil((new Date(data.exam_target_date).getTime() - Date.now()) / 86400000)
        setDDay(diff)
        // days since we started (proxy: use negative of diff if exam is in future)
        setStudyDaysSince(Math.max(0, 365 - diff))
      }
      if (data.region)            setRegionInput(String(data.region))
      if (data.daily_study_hours) setDailyHoursInput(String(data.daily_study_hours))
    } catch { /* ignore */ }

    // Chapter stats
    try {
      const res   = await fetch('/api/v1/report')
      const data  = await res.json()
      const stats: ChapterStat[] = data.chapter_stats ?? []

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

  const loadReport = async () => {
    try {
      const res  = await fetch('/api/v1/report')
      const data = await res.json()
      setAllChapterStats(data.chapter_stats  ?? [])
      setAllQuestionStats(data.question_stats ?? [])
    } catch { /* ignore */ }
    setReportLoaded(true)
  }

  const handleHeartVideo = async (title: string) => {
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
      if (examDateInput) {
        const diff = Math.ceil((new Date(examDateInput).getTime() - Date.now()) / 86400000)
        setDDay(diff)
        setStudyDaysSince(Math.max(0, 365 - diff))
      } else {
        setDDay(null)
        setStudyDaysSince(0)
      }
    } catch { /* ignore */ }
    setSavingProfile(false)
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
        {dDay === null ? (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E24B4A]/10 rounded-xl flex items-center justify-center text-[20px] flex-shrink-0">
              📅
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-[#1A1A1A]">D-Day를 설정해 보세요</p>
              <p className="text-[11px] text-[#ADADAD]">목표일을 설정하면 학습 계획을 도와드려요</p>
            </div>
            <button
              onClick={() => router.push('/trainer/dashboard?tab=profile')}
              className="text-[12px] font-bold text-[#E24B4A] flex-shrink-0"
            >
              설정하기
            </button>
          </div>
        ) : (
          <div className="bg-[#1A1A1A] rounded-2xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[11px] text-white/50 mb-0.5">학습 시작 이후</p>
              <p className="text-[22px] font-black text-white">학습 D+{studyDaysSince}일</p>
            </div>
            <div className="bg-[#E24B4A] rounded-xl px-4 py-3 text-center flex-shrink-0">
              <p className="text-[10px] text-white/70 font-bold mb-0.5">남은 기간</p>
              <p className="text-[22px] font-black text-white leading-none">
                {dDay > 0 ? `D-${dDay}` : dDay === 0 ? 'D-Day' : `D+${Math.abs(dDay)}`}
              </p>
            </div>
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
        ) : (
          <button
            onClick={() => {
              const first = subjectCards.find((c) => c.subjectId)
              if (first?.subjectId) router.push(`/chapters/${first.subjectId}`)
              else router.push('/trainer/dashboard?tab=classroom')
            }}
            className="w-full bg-[#E24B4A] text-white rounded-2xl p-4 flex items-center gap-3 active:opacity-90"
          >
            <span className="text-[24px]">📚</span>
            <div className="text-left flex-1">
              <p className="text-[15px] font-bold">오늘의 학습 시작하기</p>
              <p className="text-[11px] text-white/70">지금 바로 시작해보세요</p>
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
  // ③ REPORT TAB
  // ══════════════════════════════════════════════════════════════════
  const overallWrongRate  = allChapterStats.length > 0
    ? Math.round(allChapterStats.reduce((s, c) => s + c.wrong_rate, 0) / allChapterStats.length) : null
  const weakChapters      = allChapterStats.filter((s) => s.wrong_rate >= 40)
  const topWrongQuestions = [...allQuestionStats].sort((a, b) => b.wrong_rate - a.wrong_rate).slice(0, 5)

  const renderReport = () => (
    <div className="overflow-y-auto p-4 pb-24 space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>
      <div className="pt-8">
        <p className="text-[12px] text-[#ADADAD]">학습 분석</p>
        <h2 className="text-[20px] font-black text-[#1A1A1A]">리포트</h2>
      </div>

      {allChapterStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart2 size={48} className="text-[#ADADAD] mb-3" />
          <p className="text-[15px] font-bold text-[#1A1A1A] mb-1">아직 데이터가 없어요</p>
          <p className="text-[12px] text-[#ADADAD]">테스트를 완료하면 리포트가 생성됩니다</p>
        </div>
      ) : (
        <>
          <div className="bg-[#1A1A1A] rounded-2xl p-5 text-white text-center">
            <p className="text-[11px] text-white/50 uppercase tracking-wider mb-2">전체 평균 오답률</p>
            <div className="text-[52px] font-black text-[#E24B4A] leading-none">{overallWrongRate}%</div>
            <p className="text-[12px] text-white/50 mt-2">{allChapterStats.length}개 챕터 완료</p>
          </div>

          {weakChapters.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">🔥 취약 챕터 (오답률 40%↑)</p>
              <div className="space-y-2">
                {weakChapters.slice(0, 5).map((s, i) => (
                  <div key={i} className="bg-white rounded-xl border border-[#E24B4A]/20 p-3 flex items-center gap-3">
                    <Flame size={15} className="text-[#E24B4A] flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[12px] font-semibold text-[#1A1A1A]">챕터 {i + 1}</p>
                        <span className="text-[10px] text-[#E24B4A] font-bold">{s.wrong_rate}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F0F0EE] rounded-full overflow-hidden">
                        <div className="h-full bg-[#E24B4A] rounded-full" style={{ width: `${s.wrong_rate}%` }} />
                      </div>
                    </div>
                    <button onClick={() => router.push(`/lesson/${s.chapter_id}`)} className="text-[11px] text-[#E24B4A] font-bold flex-shrink-0">재도전</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">챕터별 성적</p>
            <div className="space-y-2">
              {allChapterStats.map((s, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#E5E5E5] p-3 flex items-center gap-3">
                  <Check size={14} className="text-[#639922] flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[12px] font-semibold text-[#1A1A1A]">챕터 {i + 1}</p>
                      {s.wrong_rate >= 40 && <Flame size={11} className="text-[#E24B4A]" />}
                    </div>
                    <p className="text-[10px] text-[#ADADAD]">
                      {s.total_attempts}회 도전 · {s.last_attempt_at ? new Date(s.last_attempt_at).toLocaleDateString('ko-KR') : '-'}
                    </p>
                  </div>
                  <span className={`text-[13px] font-black ${
                    s.avg_score >= 80 ? 'text-[#639922]' : s.avg_score >= 60 ? 'text-[#378ADD]' : 'text-[#E24B4A]'
                  }`}>{s.avg_score}점</span>
                </div>
              ))}
            </div>
          </div>

          {topWrongQuestions.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">가장 많이 틀린 문제 TOP 5</p>
              <div className="space-y-2">
                {topWrongQuestions.map((q, i) => (
                  <div key={i} className="bg-white rounded-xl border border-[#E5E5E5] p-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#E24B4A]/10 flex items-center justify-center text-[12px] font-black text-[#E24B4A] flex-shrink-0">{i + 1}</div>
                    <div className="flex-1">
                      <p className="text-[11px] text-[#6B6B6B]">문제 ID: {q.question_id}</p>
                      <p className="text-[11px] text-[#E24B4A] font-semibold">오답률 {q.wrong_rate}%</p>
                    </div>
                    <span className="text-[10px] text-[#ADADAD]">{q.total_attempts}회</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )

  // ══════════════════════════════════════════════════════════════════
  // ④ PROFILE TAB
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
            {style === 'memorizer' ? '🧠' : style === 'conceptualizer' ? '💡' : '❓'}
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-[#1A1A1A]">
              {style === 'memorizer' ? '암기형' : style === 'conceptualizer' ? '이해형' : '미측정'}
            </p>
          </div>
          <button
            onClick={() => { localStorage.removeItem(STYLE_KEY); router.push('/onboarding/style-test') }}
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
        {tab === 'report'    && renderReport()}
        {tab === 'profile'   && renderProfile()}
      </div>

      <BottomTabBar />
    </div>
  )
}
