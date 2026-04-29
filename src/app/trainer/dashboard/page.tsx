'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ChevronRight, Plus, Heart, Flame, BarChart2,
  Check, RefreshCw, Calendar, Clock, MapPin,
} from 'lucide-react'

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

interface ChapterStat {
  chapter_id: string
  subject_id: string
  avg_score: number
  wrong_rate: number
  total_attempts: number
  last_attempt_at: string | null
}

interface QuestionStat {
  question_id: string
  chapter_id: string
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

// ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('home')
  const [loading, setLoading] = useState(true)

  // 공통
  const [certLabel, setCertLabel] = useState('')
  const [subjects, setSubjects] = useState<string[]>([])
  const [style, setStyle] = useState<string | null>(null)
  const [userName, setUserName] = useState('')

  // 홈
  const [dDay, setDDay] = useState<number | null>(null)
  const [recentStats, setRecentStats] = useState<ChapterStat[]>([])
  const [topWrongStat, setTopWrongStat] = useState<ChapterStat | null>(null)
  const [heartedVideo, setHeartedVideo] = useState(false)

  // 강의실
  const [subjectCards, setSubjectCards] = useState<SubjectCard[]>([])
  const [bookmarks, setBookmarks] = useState<VideoBookmark[]>([])
  const [classroomLoaded, setClassroomLoaded] = useState(false)

  // 리포트
  const [allChapterStats, setAllChapterStats] = useState<ChapterStat[]>([])
  const [allQuestionStats, setAllQuestionStats] = useState<QuestionStat[]>([])
  const [reportLoaded, setReportLoaded] = useState(false)

  // 내정보
  const [examDateInput, setExamDateInput] = useState('')
  const [regionInput, setRegionInput] = useState('')
  const [dailyHoursInput, setDailyHoursInput] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // ── 초기화 ────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    initCommon()
  }, [status, router])

  useEffect(() => {
    if (tab === 'classroom' && !classroomLoaded) loadClassroom()
    if (tab === 'report'    && !reportLoaded)    loadReport()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const initCommon = async () => {
    const cert    = localStorage.getItem(CERT_KEY)
    const subs    = localStorage.getItem(SUBJECTS_KEY)
    const styleVal = localStorage.getItem(STYLE_KEY)

    if (cert)   { setCertLabel(CERT_LABELS[cert] ?? cert) }
    if (styleVal) setStyle(styleVal)
    if (session?.user?.name) setUserName(session.user.name.split(' ')[0])
    if (subs) {
      try { setSubjects(JSON.parse(subs)) } catch { /* ignore */ }
    }

    // 프로필 설정 (D-Day)
    try {
      const res  = await fetch('/api/v1/profile-settings')
      const data = await res.json()
      if (data.exam_target_date) {
        setExamDateInput(data.exam_target_date)
        const diff = Math.ceil((new Date(data.exam_target_date).getTime() - Date.now()) / 86400000)
        setDDay(diff)
      }
      if (data.region)            setRegionInput(String(data.region))
      if (data.daily_study_hours) setDailyHoursInput(String(data.daily_study_hours))
    } catch { /* ignore */ }

    // 홈용 최근 통계
    try {
      const res  = await fetch('/api/v1/report')
      const data = await res.json()
      const stats: ChapterStat[] = data.chapter_stats ?? []
      const sorted = [...stats].sort((a, b) =>
        new Date(b.last_attempt_at ?? 0).getTime() - new Date(a.last_attempt_at ?? 0).getTime()
      )
      setRecentStats(sorted.slice(0, 3))
      const topWrong = [...stats].sort((a, b) => b.wrong_rate - a.wrong_rate).find((s) => s.wrong_rate > 0)
      setTopWrongStat(topWrong ?? null)
    } catch { /* ignore */ }

    setLoading(false)
  }

  const loadClassroom = async () => {
    let selectedNames = subjects
    if (selectedNames.length === 0) {
      try {
        const res  = await fetch('/api/v1/selected-subjects')
        const data = await res.json()
        if (Array.isArray(data.selected_subjects)) {
          selectedNames = data.selected_subjects
          setSubjects(selectedNames)
          localStorage.setItem(SUBJECTS_KEY, JSON.stringify(selectedNames))
        }
      } catch { /* ignore */ }
    }

    if (selectedNames.length > 0) {
      const { data: dbSubjects } = await supabase
        .from('subjects')
        .select('id, name')
        .in('name', selectedNames)

      const cards: SubjectCard[] = selectedNames.map((name) => {
        const meta = SUBJECT_META[name] ?? { icon: '📚', desc: '' }
        const db   = (dbSubjects ?? []).find((d: { id: string; name: string }) => d.name === name)
        return { name, icon: meta.icon, desc: meta.desc, subjectId: db?.id ?? null }
      })
      setSubjectCards(cards)
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

  const handleHeartVideo = async () => {
    if (heartedVideo) return
    setHeartedVideo(true)
    fetch('/api/v1/video-bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: '', video_title: 'Kinepia Daily', video_thumbnail: '' }),
    }).catch(() => {})
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
      } else {
        setDDay(null)
      }
    } catch { /* ignore */ }
    setSavingProfile(false)
  }

  // ── 로딩 ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // 홈 탭
  // ══════════════════════════════════════════════════════════════════
  const renderHome = () => (
    <div className="overflow-y-auto p-4 pb-24 space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>
      {/* Greeting */}
      <div className="flex items-center justify-between pt-8">
        <div>
          <p className="text-[12px] text-[#ADADAD]">{certLabel || 'Kinepia'}</p>
          <h1 className="text-[20px] font-black text-[#1A1A1A]">
            {userName ? `${userName}님의 학습` : '오늘도 화이팅!'}
          </h1>
        </div>
        {dDay !== null && (
          <div className="bg-[#E24B4A] text-white rounded-2xl px-3 py-2 text-center min-w-[60px]">
            <div className="text-[9px] font-bold opacity-70 uppercase">D-Day</div>
            <div className="text-[20px] font-black leading-none">
              {dDay > 0 ? `-${dDay}` : dDay === 0 ? '🎯' : `+${Math.abs(dDay)}`}
            </div>
          </div>
        )}
      </div>

      {/* Video card */}
      <div className="bg-[#1A1A1A] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-center bg-gradient-to-br from-[#E24B4A]/20 to-[#1A1A1A]" style={{ aspectRatio: '16/9' }}>
          <div className="text-center">
            <div className="text-[48px]">🎬</div>
            <p className="text-white/50 text-[12px] mt-1">오늘의 추천 영상</p>
          </div>
        </div>
        <div className="p-3 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold text-white">Kinepia Daily</p>
            <p className="text-[11px] text-white/50">오늘의 핵심 강의</p>
          </div>
          <button onClick={handleHeartVideo} className={`p-2 rounded-full transition-colors ${heartedVideo ? 'bg-[#E24B4A]/20' : 'bg-white/10 active:bg-white/20'}`}>
            <Heart size={18} className={heartedVideo ? 'text-[#E24B4A] fill-[#E24B4A]' : 'text-white'} />
          </button>
        </div>
      </div>

      {/* D-Day 설정 유도 */}
      {dDay === null && (
        <button
          onClick={() => setTab('profile')}
          className="w-full bg-white rounded-2xl border border-[#E5E5E5] p-3 flex items-center gap-3 active:bg-[#F5F5F3]"
        >
          <Calendar size={18} className="text-[#E24B4A] flex-shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-[13px] font-bold text-[#1A1A1A]">시험 D-Day를 설정해보세요</p>
            <p className="text-[11px] text-[#ADADAD]">내정보 탭에서 목표 시험일 설정 가능</p>
          </div>
          <ChevronRight size={14} className="text-[#ADADAD]" />
        </button>
      )}

      {/* 재도전 추천 */}
      {topWrongStat && (
        <div>
          <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">🔥 재도전 추천</p>
          <button
            onClick={() => router.push(`/lesson/${topWrongStat.chapter_id}`)}
            className="w-full bg-white rounded-2xl border-2 border-[#E24B4A]/20 p-4 text-left flex items-center gap-3 active:bg-[#F5F5F3]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#E24B4A]/10 flex items-center justify-center text-[20px]">🔥</div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-[#1A1A1A]">오답률 높은 챕터</p>
              <p className="text-[11px] text-[#E24B4A] font-semibold">오답률 {topWrongStat.wrong_rate}%</p>
            </div>
            <ChevronRight size={14} className="text-[#ADADAD]" />
          </button>
        </div>
      )}

      {/* 최근 학습 이력 */}
      {recentStats.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">최근 학습 이력</p>
          <div className="space-y-2">
            {recentStats.map((s, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#E5E5E5] p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F5F5F3] flex items-center justify-center text-[11px] font-black text-[#ADADAD]">{i + 1}</div>
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-[#1A1A1A]">챕터 학습</p>
                  <p className="text-[10px] text-[#ADADAD]">
                    {s.last_attempt_at ? new Date(s.last_attempt_at).toLocaleDateString('ko-KR') : '-'}
                    {' · '}평균 {s.avg_score}점
                  </p>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  s.avg_score >= 80 ? 'bg-[#63992215] text-[#639922]'
                  : s.avg_score >= 60 ? 'bg-[#378ADD15] text-[#378ADD]'
                  : 'bg-[#E24B4A10] text-[#E24B4A]'
                }`}>{s.avg_score}점</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 첫 방문 안내 */}
      {recentStats.length === 0 && !topWrongStat && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-8 text-center">
          <div className="text-[40px] mb-3">📚</div>
          <p className="text-[15px] font-bold text-[#1A1A1A] mb-1">아직 학습 이력이 없어요</p>
          <p className="text-[12px] text-[#ADADAD] mb-5">강의실에서 과목을 선택해 학습을 시작해보세요!</p>
          <button onClick={() => setTab('classroom')} className="px-5 py-2.5 bg-[#E24B4A] text-white rounded-xl text-[13px] font-bold">
            강의실 바로가기
          </button>
        </div>
      )}
    </div>
  )

  // ══════════════════════════════════════════════════════════════════
  // 강의실 탭
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
                  {sid ? <ChevronRight size={16} className="text-[#ADADAD] flex-shrink-0" /> : (
                    <span className="text-[10px] text-[#ADADAD]">학습 준비중</span>
                  )}
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

      {/* 찜한 영상 */}
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
  // 리포트 탭
  // ══════════════════════════════════════════════════════════════════
  const overallWrongRate = allChapterStats.length > 0
    ? Math.round(allChapterStats.reduce((s, c) => s + c.wrong_rate, 0) / allChapterStats.length)
    : null
  const weakChapters        = allChapterStats.filter((s) => s.wrong_rate >= 40)
  const topWrongQuestions   = [...allQuestionStats].sort((a, b) => b.wrong_rate - a.wrong_rate).slice(0, 5)

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
          {/* 전체 오답률 */}
          <div className="bg-[#1A1A1A] rounded-2xl p-5 text-white text-center">
            <p className="text-[11px] text-white/50 uppercase tracking-wider mb-2">전체 평균 오답률</p>
            <div className="text-[52px] font-black text-[#E24B4A] leading-none">{overallWrongRate}%</div>
            <p className="text-[12px] text-white/50 mt-2">{allChapterStats.length}개 챕터 완료</p>
          </div>

          {/* 취약 챕터 */}
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

          {/* 챕터별 성적 */}
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

          {/* TOP 5 오답 문제 */}
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
  // 내정보 탭
  // ══════════════════════════════════════════════════════════════════
  const renderProfile = () => (
    <div className="overflow-y-auto p-4 pb-24 space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>
      <div className="pt-8">
        <h2 className="text-[20px] font-black text-[#1A1A1A]">내 정보</h2>
      </div>

      {/* 학습 성향 */}
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

      {/* 자격증 · 과목 */}
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

      {/* 학습 설정 */}
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

      {/* 링크 */}
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
  // 메인 렌더
  // ══════════════════════════════════════════════════════════════════
  const TAB_ITEMS: { id: Tab; icon: string; label: string }[] = [
    { id: 'home',      icon: '🏠', label: '홈' },
    { id: 'classroom', icon: '📚', label: '강의실' },
    { id: 'report',    icon: '📊', label: '리포트' },
    { id: 'profile',   icon: '👤', label: '내정보' },
  ]

  return (
    <div className="bg-[#F5F5F3] flex flex-col" style={{ height: '100dvh', maxHeight: '100dvh' }}>
      <div className="flex-1 overflow-hidden">
        {tab === 'home'      && renderHome()}
        {tab === 'classroom' && renderClassroom()}
        {tab === 'report'    && renderReport()}
        {tab === 'profile'   && renderProfile()}
      </div>

      {/* 탭 바 */}
      <div className="bg-white border-t border-[#E5E5E5] flex items-center justify-around px-2 py-2.5 flex-shrink-0">
        {TAB_ITEMS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="flex flex-col items-center gap-0.5 px-4">
            <span className="text-[18px]">{t.icon}</span>
            <span className={`text-[10px] font-medium ${tab === t.id ? 'text-[#E24B4A]' : 'text-[#ADADAD]'}`}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
