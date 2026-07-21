'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Check, AlertCircle, ChevronLeft, Plus } from 'lucide-react'
import { track } from '@vercel/analytics'

const CERT_KEY       = 'kinepia_selected_cert'
const SUBJECTS_KEY   = 'kinepia_selected_subjects'
const ADDITIONAL_KEY = 'kinepia_additional_subjects'

interface SubjectDef { name: string; icon: string; desc: string }
interface SubjectWithDb extends SubjectDef { dbId: string | null; chapterCount: number }

// ── 자격증 설정 ────────────────────────────────────────────────────
type CertMode = 'all-required' | 'select-n'

interface CertConfig {
  label: string
  mode: CertMode
  subjects: SubjectDef[]
  selectCount?: number   // select-n: 정확히 이 수만큼 선택
  additional: SubjectDef[]
}

const CERT_CONFIG: Record<string, CertConfig> = {
  'sports-instructor': {
    label: '생활스포츠지도사',
    mode: 'select-n',
    selectCount: 5,
    subjects: [
      { name: '운동생리학',   icon: '🫀', desc: '심폐기능·에너지 대사' },
      { name: '한국체육사',   icon: '🏛️', desc: '한국 체육의 역사적 흐름' },
      { name: '스포츠교육학', icon: '📚', desc: '교수법, 코칭 이론' },
      { name: '스포츠윤리',   icon: '⚖️', desc: '페어플레이·도덕·반도핑' },
      { name: '운동역학',     icon: '⚙️', desc: '운동의 물리적 원리' },
      { name: '스포츠사회학', icon: '🏟️', desc: '스포츠와 사회의 관계' },
      { name: '스포츠심리학', icon: '🧠', desc: '동기, 루틴, 심리기술' },
    ],
    additional: [
      { name: '건강·체력 평가', icon: '📊', desc: '체력검사, 측정·평가 기준' },
      { name: '건강교육론',     icon: '🏫', desc: '건강증진 교육 이론' },
      { name: '기능해부학',     icon: '🦴', desc: '근육·뼈대·관절 구조' },
      { name: '노인체육론',     icon: '👴', desc: '노인 대상 체육 지도' },
      { name: '병태생리학',     icon: '🔬', desc: '질환의 발생 원리' },
      { name: '스포츠영양학',   icon: '🥗', desc: '영양소와 운동 수행' },
      { name: '운동부하검사',   icon: '🏃', desc: '심전도, 부하 프로토콜' },
      { name: '운동상해',       icon: '🩹', desc: '손상·응급처치·재활' },
      { name: '운동처방론',     icon: '📋', desc: 'FITT 원칙, 운동 처방' },
      { name: '유아체육론',     icon: '👶', desc: '유아 발달과 체육 활동' },
      { name: '장애인스포츠론', icon: '♿', desc: '장애인 스포츠 이론' },
      { name: '체육측정평가론', icon: '📏', desc: '측정 도구·통계·평가' },
      { name: '트레이닝론',     icon: '💪', desc: '훈련 원리와 프로그래밍' },
      { name: '특수체육론',     icon: '🎯', desc: '특수 집단 체육 지도' },
    ],
  },
  'sports-instructor-2': {
    label: '2급 생활스포츠지도사',
    mode: 'select-n',
    selectCount: 5,
    subjects: [
      { name: '운동생리학',   icon: '🫀', desc: '심폐기능·에너지 대사' },
      { name: '한국체육사',   icon: '🏛️', desc: '한국 체육의 역사적 흐름' },
      { name: '스포츠교육학', icon: '📚', desc: '교수법, 코칭 이론' },
      { name: '스포츠윤리',   icon: '⚖️', desc: '페어플레이·도덕·반도핑' },
      { name: '운동역학',     icon: '⚙️', desc: '운동의 물리적 원리' },
      { name: '스포츠사회학', icon: '🏟️', desc: '스포츠와 사회의 관계' },
      { name: '스포츠심리학', icon: '🧠', desc: '동기, 루틴, 심리기술' },
    ],
    additional: [
      { name: '건강·체력 평가', icon: '📊', desc: '체력검사, 측정·평가 기준' },
      { name: '건강교육론',     icon: '🏫', desc: '건강증진 교육 이론' },
      { name: '기능해부학',     icon: '🦴', desc: '근육·뼈대·관절 구조' },
      { name: '노인체육론',     icon: '👴', desc: '노인 대상 체육 지도' },
      { name: '병태생리학',     icon: '🔬', desc: '질환의 발생 원리' },
      { name: '스포츠영양학',   icon: '🥗', desc: '영양소와 운동 수행' },
      { name: '운동부하검사',   icon: '🏃', desc: '심전도, 부하 프로토콜' },
      { name: '운동상해',       icon: '🩹', desc: '손상·응급처치·재활' },
      { name: '운동처방론',     icon: '📋', desc: 'FITT 원칙, 운동 처방' },
      { name: '유아체육론',     icon: '👶', desc: '유아 발달과 체육 활동' },
      { name: '장애인스포츠론', icon: '♿', desc: '장애인 스포츠 이론' },
      { name: '체육측정평가론', icon: '📏', desc: '측정 도구·통계·평가' },
      { name: '트레이닝론',     icon: '💪', desc: '훈련 원리와 프로그래밍' },
      { name: '특수체육론',     icon: '🎯', desc: '특수 집단 체육 지도' },
    ],
  },
  'exercise-prescriptionist': {
    label: '건강운동관리사',
    mode: 'all-required',
    subjects: [
      { name: '건강·체력평가', icon: '📊', desc: '체력검사, 측정 방법, 평가 기준' },
      { name: '기능해부학',   icon: '🦴', desc: '근육·뼈대·관절의 기능과 구조' },
      { name: '병태생리학',   icon: '🔬', desc: '질환의 발생 원리와 병태 기전' },
      { name: '스포츠심리학', icon: '🧠', desc: '동기, 루틴, 심리기술 훈련' },
      { name: '운동부하검사', icon: '🏃', desc: '심전도, 운동부하 프로토콜' },
      { name: '운동상해',     icon: '🩹', desc: '스포츠 손상, 응급처치, 재활' },
      { name: '운동생리학',   icon: '🫀', desc: '심폐기능·에너지 대사·운동 적응' },
      { name: '운동처방론',   icon: '📋', desc: 'FITT 원칙, 대상별 운동 처방' },
    ],
    additional: [],
  },
  'sports-instructor-2-written': {
    label: '2급 생활스포츠지도사 필기',
    mode: 'select-n',
    selectCount: 5,
    subjects: [
      { name: '스포츠교육학', icon: '📚', desc: '교수법, 코칭 이론' },
      { name: '스포츠사회학', icon: '🏟️', desc: '스포츠와 사회의 관계' },
      { name: '스포츠심리학', icon: '🧠', desc: '동기, 루틴, 심리기술' },
      { name: '스포츠윤리',   icon: '⚖️', desc: '페어플레이·도덕·반도핑' },
      { name: '운동생리학',   icon: '🫀', desc: '심폐기능·에너지 대사' },
      { name: '운동역학',     icon: '⚙️', desc: '운동의 물리적 원리' },
      { name: '한국체육사',   icon: '🏛️', desc: '한국 체육의 역사적 흐름' },
    ],
    additional: [],
  },
  'sports-instructor-2-practical': {
    label: '2급 생활스포츠지도사 구술/실기',
    mode: 'all-required',
    subjects: [
      { name: '보디빌딩', icon: '🏋️', desc: '보디빌딩 구술·실기' },
    ],
    additional: [],
  },
  'iipa-pilates-lv1': {
    label: 'IIPA 필라테스 지도자 자격증 Lv1',
    mode: 'all-required',
    subjects: [
      { name: '필라테스 해부학', icon: '🦴', desc: '뼈·관절·근육 기초 해부학' },
    ],
    additional: [],
  },
  'iipa-pilates-lv2': {
    label: 'IIPA 필라테스 지도자 자격증 Lv2',
    mode: 'all-required',
    subjects: [
      { name: '필라테스 해부학', icon: '🦴', desc: '뼈·관절·근육 기초 해부학' },
    ],
    additional: [],
  },
}

// ── 컴포넌트 ──────────────────────────────────────────────────────
export default function SelectSubjectPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [certId, setCertId] = useState<string | null>(null)
  const [mainWithDb, setMainWithDb] = useState<SubjectWithDb[]>([])
  const [mainSelected, setMainSelected] = useState<string[]>([])  // select-n mode
  const [additionalSelected, setAdditionalSelected] = useState<string[]>([])
  const [popup, setPopup] = useState<SubjectDef | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }

    const cert = localStorage.getItem(CERT_KEY)
    if (!cert || !CERT_CONFIG[cert]) { router.replace('/select-cert'); return }
    setCertId(cert)

    // 기존 추가 과목 복원
    try {
      const cached = localStorage.getItem(ADDITIONAL_KEY)
      if (cached) setAdditionalSelected(JSON.parse(cached))
    } catch { /* ignore */ }

    // select-n: 기존 선택 복원
    const config = CERT_CONFIG[cert]
    if (config.mode === 'select-n') {
      try {
        const cached = localStorage.getItem(SUBJECTS_KEY)
        if (cached) {
          const prev: string[] = JSON.parse(cached)
          const certNames = config.subjects.map((s) => s.name)
          setMainSelected(prev.filter((n) => certNames.includes(n)))
        }
      } catch { /* ignore */ }
    }

    initDb(cert)
  }, [status, router])

  const initDb = async (cert: string) => {
    const config = CERT_CONFIG[cert]
    const { data: dbSubjects } = await supabase
      .from('subjects')
      .select('id, name')
      .in('name', config.subjects.map((s) => s.name))

    // cert slug(예: 'iipa-pilates-lv1') → certifications.id(uuid). 같은 subject를
    // 여러 자격증이 공유하는 경우(예: IIPA Lv1/Lv2) course_certifications으로
    // 이 자격증에 매핑된 course만 챕터 수에 반영하기 위함
    // ── 2026-07-20 수정: .single()은 0행일 때도 PGRST116을 던짐 ──
    // user_certifications.cert_id에는 certifications.slug와 형식이 다른 값
    // ('sports-instructor-2-practical' 등)이 존재해 이 조회가 0행이 되는 경로가 있음.
    // slug UNIQUE 제약으로도 막을 수 없어 maybeSingle()로 0행을 허용하고,
    // deprecated 행을 집지 않도록 is_active=true 조건을 추가한다.
    const { data: certRow } = await supabase
      .from('certifications').select('id').eq('slug', cert).eq('is_active', true).maybeSingle()
    const certUuid = certRow?.id ?? null

    const withDb: SubjectWithDb[] = await Promise.all(
      config.subjects.map(async (s) => {
        const db = dbSubjects?.find((d) => d.name === s.name) ?? null
        let chapterCount = 0
        if (db) {
          const { data: courses } = await supabase.from('courses').select('id').eq('subject_id', db.id)
          let courseIds = (courses ?? []).map((c) => c.id)
          if (certUuid && courseIds.length > 0) {
            const { data: mappedCourses } = await supabase
              .from('course_certifications')
              .select('course_id')
              .eq('certification_id', certUuid)
              .in('course_id', courseIds)
            // 매핑된 course가 하나라도 있을 때만 좁힘 — 없으면(미등록 자격증) 전체 사용
            const mappedIds = (mappedCourses ?? []).map((m) => m.course_id)
            if (mappedIds.length > 0) courseIds = mappedIds
          }
          if (courseIds.length > 0) {
            const { count } = await supabase
              .from('chapters').select('id', { count: 'exact', head: true })
              .in('course_id', courseIds)
            chapterCount = count ?? 0
          }
        }
        return { ...s, dbId: db?.id ?? null, chapterCount }
      })
    )
    setMainWithDb(withDb)
    setLoading(false)
  }

  // select-n 토글
  const toggleMain = (name: string) => {
    if (!certId) return
    const { selectCount = 5 } = CERT_CONFIG[certId]
    setShowWarning(false)
    setMainSelected((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name)
      if (prev.length >= selectCount) { setShowWarning(true); return prev }
      return [...prev, name]
    })
  }

  // 추가 과목 팝업 확인
  const confirmAdditional = () => {
    if (!popup) return
    setAdditionalSelected((prev) =>
      prev.includes(popup.name) ? prev : [...prev, popup.name]
    )
    setPopup(null)
  }

  // 추가 과목 팝업 취소
  const cancelAdditional = () => setPopup(null)

  // 학습 시작
  const handleStart = async () => {
    if (saving || !certId) return
    const config = CERT_CONFIG[certId]
    const certSubjectNames = config.subjects.map((s) => s.name)
    const mainNames = config.mode === 'all-required' ? certSubjectNames : mainSelected
    const combined = [...mainNames, ...additionalSelected.filter((n) => !mainNames.includes(n))]

    setSaving(true)
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(combined))
    localStorage.setItem(ADDITIONAL_KEY, JSON.stringify(additionalSelected))
    try {
      await fetch('/api/v1/selected-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_subjects:  combined,
          selected_cert:      certId,
          required_subjects:  config.mode === 'all-required' ? certSubjectNames : [],
          additional_subjects: additionalSelected,
        }),
      })
    } catch { /* ignore */ }

    // user-certifications 연동 (userId 있을 때만)
    const userId = session?.user?.id
    if (userId) {
      try {
        const examType = certId.includes('practical') ? 'practical'
          : certId.includes('oral') ? 'oral'
          : 'written'
        const certRes = await fetch('/api/v1/user-certifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            cert_id:    localStorage.getItem(CERT_KEY) ?? '',
            cert_label: CERT_CONFIG[certId]?.label ?? certId,
            subjects:   combined,
            exam_type:  examType,
          }),
        })
        if (!certRes.ok) {
          const certData = await certRes.json()
          if (certRes.status === 400 && certData.error === '최대 3개까지 추가 가능합니다') {
            setSaving(false)
            alert('최대 3개까지 추가 가능합니다')
            return
          }
          console.error('[user-certifications POST]', certData.error)
        }
      } catch (e) {
        console.error('[user-certifications POST]', e)
      }
    }

    // 3. 대시보드 강의실 탭으로 이동
    track('subject_selected')
    router.replace('/trainer/dashboard?tab=classroom')
  }

  // ── 로딩 ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const config = certId ? CERT_CONFIG[certId] : null
  if (!config) return null

  const selectCount = config.selectCount ?? 5
  const isAllRequired = config.mode === 'all-required'
  const canStart = isAllRequired
    ? true
    : mainSelected.length === selectCount

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      {/* 헤더 */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
        <button onClick={() => router.push('/select-cert')} className="flex items-center gap-1 text-[13px] text-[#6B6B6B] mb-3">
          <ChevronLeft size={16} /> 자격증 선택
        </button>
        <p className="text-[10px] font-bold text-[#00A651] tracking-widest uppercase mb-1">{config.label}</p>
        <h1 className="text-[22px] font-black text-[#1A1A1A]">과목 선택</h1>
      </div>

      {/* 안내 배너 */}
      <div className={`mx-4 mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 ${
        isAllRequired
          ? 'bg-[#1A1A1A]/5 border border-[#1A1A1A]/10'
          : 'bg-[#378ADD]/10 border border-[#378ADD]/20'
      }`}>
        <span className="text-[15px]">{isAllRequired ? '📌' : 'ℹ️'}</span>
        <p className={`text-[12px] font-semibold ${isAllRequired ? 'text-[#1A1A1A]' : 'text-[#378ADD]'}`}>
          {isAllRequired
            ? `${config.subjects.length}개 과목 모두 필수 과목입니다`
            : `7개 과목 중 ${selectCount}개를 선택해주세요 (현재 ${mainSelected.length}/${selectCount})`
          }
        </p>
      </div>

      {/* 경고 */}
      {showWarning && (
        <div className="mx-4 mt-2 flex items-center gap-2 bg-[#00A651]/10 border border-[#00A651]/30 rounded-xl px-3 py-2.5">
          <AlertCircle size={14} className="text-[#00A651] flex-shrink-0" />
          <p className="text-[12px] font-semibold text-[#00A651]">최대 {selectCount}개까지 선택 가능합니다</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-5">
        {/* ── 시험 과목 ── */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider">시험 과목</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isAllRequired ? 'bg-[#1A1A1A] text-white' : 'bg-[#E5E5E5] text-[#6B6B6B]'
            }`}>
              {isAllRequired ? `전체 ${config.subjects.length}개 필수` : `${mainSelected.length}/${selectCount}`}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {mainWithDb.map((s) => {
              const isSelected = isAllRequired || mainSelected.includes(s.name)
              const isDisabled = !isAllRequired && !isSelected && mainSelected.length >= selectCount

              return (
                <button
                  key={s.name}
                  onClick={() => !isAllRequired && toggleMain(s.name)}
                  className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                    isAllRequired
                      ? 'border-[#1A1A1A] bg-[#1A1A1A]/5 cursor-default'
                      : isSelected
                      ? 'border-[#00A651] bg-[#00A651]/5'
                      : isDisabled
                      ? 'border-[#E5E5E5] bg-[#F5F5F3] opacity-50'
                      : 'border-[#E5E5E5] bg-white active:bg-[#F5F5F3]'
                  }`}
                >
                  {isSelected && (
                    <div className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center ${
                      isAllRequired ? 'bg-[#1A1A1A]' : 'bg-[#00A651]'
                    }`}>
                      <Check size={11} className="text-white" />
                    </div>
                  )}
                  <div className="text-[26px] mb-2">{s.icon}</div>
                  <div className="text-[13px] font-bold text-[#1A1A1A] leading-tight mb-1">{s.name}</div>
                  <div className="text-[10px] text-[#6B6B6B] mb-2 line-clamp-2">{s.desc}</div>
                  <div className="text-[10px] text-[#ADADAD]">
                    {s.chapterCount > 0 ? `${s.chapterCount}챕터` : '학습 준비중'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── 추가 관심 과목 ── */}
        {config.additional.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1 px-1">
              <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider">추가 관심 과목</p>
              <span className="text-[10px] text-[#ADADAD]">국민체육진흥공단 시험과목</span>
            </div>
            <p className="text-[11px] text-[#ADADAD] px-1 mb-3">
              시험 범위 외 추가 학습용 과목입니다
            </p>
            <div className="grid grid-cols-2 gap-3">
              {config.additional.map((s) => {
                const isAdded = additionalSelected.includes(s.name)
                return (
                  <button
                    key={s.name}
                    onClick={() => {
                      if (isAdded) {
                        setAdditionalSelected((prev) => prev.filter((n) => n !== s.name))
                      } else {
                        setPopup(s)
                      }
                    }}
                    className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                      isAdded
                        ? 'border-[#639922] bg-[#63992210]'
                        : 'border-dashed border-[#E5E5E5] bg-white active:bg-[#F5F5F3]'
                    }`}
                  >
                    {isAdded ? (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#639922] flex items-center justify-center">
                        <Check size={11} className="text-white" />
                      </div>
                    ) : (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-[#E5E5E5] flex items-center justify-center">
                        <Plus size={10} className="text-[#ADADAD]" />
                      </div>
                    )}
                    <div className="text-[24px] mb-2">{s.icon}</div>
                    <div className="text-[12px] font-bold text-[#1A1A1A] leading-tight mb-1">{s.name}</div>
                    <div className="text-[10px] text-[#6B6B6B] line-clamp-2">{s.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 팝업 ── */}
      {popup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end p-4">
          <div className="w-full bg-white rounded-2xl p-5 space-y-4">
            <div className="text-[18px] text-center">{popup.icon}</div>
            <p className="text-[14px] font-semibold text-[#1A1A1A] text-center leading-snug">
              &ldquo;{popup.name}&rdquo;은<br />
              {config.label} 시험과목이 아닙니다.<br />
              추가 학습 과목으로 등록하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                onClick={cancelAdditional}
                className="flex-1 py-3 rounded-xl border-2 border-[#E5E5E5] text-[14px] font-semibold text-[#6B6B6B]"
              >
                취소
              </button>
              <button
                onClick={confirmAdditional}
                className="flex-1 py-3 rounded-xl bg-[#00A651] text-white text-[14px] font-bold"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 하단 버튼 ── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E5E5E5]">
        <button
          onClick={handleStart}
          disabled={!canStart || saving}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#00A651] disabled:opacity-40 text-white rounded-2xl text-[16px] font-bold"
        >
          {saving
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : isAllRequired
            ? `학습 시작 (${config.subjects.length}과목)`
            : `학습 시작 (${mainSelected.length + additionalSelected.length}과목)`
          }
        </button>
      </div>
    </div>
  )
}
