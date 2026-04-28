'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Check, Lock, AlertCircle, ChevronLeft } from 'lucide-react'

const CERT_KEY     = 'kinepia_selected_cert'
const SUBJECTS_KEY = 'kinepia_selected_subjects'
const MAX_OPTIONAL = 3

interface SubjectDef {
  name: string
  icon: string
  desc: string
}

interface CertConfig {
  label: string
  required: SubjectDef[]
  optional: SubjectDef[]
}

const CERT_CONFIG: Record<string, CertConfig> = {
  'health-exercise-manager': {
    label: '건강운동관리사',
    required: [
      { name: '운동생리학', icon: '🫀', desc: '심폐기능·에너지 대사·운동 적응' },
      { name: '기능해부학', icon: '🦴', desc: '근육·뼈대·관절의 기능과 구조' },
    ],
    optional: [
      { name: '건강·체력평가', icon: '📊', desc: '체력검사, 측정 방법, 평가 기준' },
      { name: '운동처방론',    icon: '📋', desc: 'FITT 원칙, 대상별 운동 처방' },
      { name: '운동부하검사',  icon: '🏃', desc: '심전도, 운동부하 프로토콜' },
      { name: '운동상해',      icon: '🩹', desc: '스포츠 손상, 응급처치, 재활' },
      { name: '병태생리학',    icon: '🔬', desc: '질환의 발생 원리와 병태 기전' },
      { name: '스포츠심리학',  icon: '🧠', desc: '동기, 루틴, 심리기술 훈련' },
    ],
  },
  'sports-instructor': {
    label: '생활스포츠지도사',
    required: [
      { name: '스포츠사회학', icon: '🏟️', desc: '스포츠와 사회의 관계' },
      { name: '스포츠윤리',   icon: '⚖️', desc: '페어플레이·도덕·반도핑' },
    ],
    optional: [
      { name: '스포츠교육학',  icon: '📚', desc: '교수법, 코칭 이론' },
      { name: '스포츠심리학',  icon: '🧠', desc: '동기, 루틴, 심리기술' },
      { name: '운동생리학',    icon: '🫀', desc: '심폐기능·에너지 대사' },
      { name: '운동역학',      icon: '⚙️', desc: '운동의 물리적 원리' },
      { name: '스포츠영양학',  icon: '🥗', desc: '영양소와 운동 수행' },
      { name: '운동처방',      icon: '📋', desc: '대상별 운동 처방 기초' },
    ],
  },
  'sports-instructor-2': {
    label: '2급 생활스포츠지도사',
    required: [
      { name: '스포츠사회학', icon: '🏟️', desc: '스포츠와 사회의 관계' },
      { name: '스포츠윤리',   icon: '⚖️', desc: '페어플레이·도덕·반도핑' },
    ],
    optional: [
      { name: '스포츠교육학',  icon: '📚', desc: '교수법, 코칭 이론' },
      { name: '스포츠심리학',  icon: '🧠', desc: '동기, 루틴, 심리기술' },
      { name: '운동생리학',    icon: '🫀', desc: '심폐기능·에너지 대사' },
      { name: '운동역학',      icon: '⚙️', desc: '운동의 물리적 원리' },
      { name: '스포츠영양학',  icon: '🥗', desc: '영양소와 운동 수행' },
      { name: '운동처방',      icon: '📋', desc: '대상별 운동 처방 기초' },
    ],
  },
}

interface SubjectWithDb extends SubjectDef {
  dbId: string | null
  chapterCount: number
  isRequired: boolean
}

export default function SelectSubjectPage() {
  const { status } = useSession()
  const router = useRouter()

  const [certId, setCertId] = useState<string | null>(null)
  const [allSubjects, setAllSubjects] = useState<SubjectWithDb[]>([])
  const [optionalSelected, setOptionalSelected] = useState<string[]>([])
  const [showWarning, setShowWarning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }

    const cert = localStorage.getItem(CERT_KEY)
    if (!cert || !CERT_CONFIG[cert]) {
      router.replace('/select-cert')
      return
    }
    setCertId(cert)

    // 기존 선택 복원 (optional 과목만)
    const cached = localStorage.getItem(SUBJECTS_KEY)
    if (cached) {
      try {
        const prev: string[] = JSON.parse(cached)
        const reqNames = CERT_CONFIG[cert].required.map((r) => r.name)
        setOptionalSelected(prev.filter((n) => !reqNames.includes(n)))
      } catch { /* ignore */ }
    }

    initSubjects(cert)
  }, [status, router])

  const initSubjects = async (cert: string) => {
    const config = CERT_CONFIG[cert]
    const allDefs = [...config.required, ...config.optional]
    const names = allDefs.map((s) => s.name)

    const { data: dbSubjects } = await supabase
      .from('subjects')
      .select('id, name')
      .in('name', names)

    const withDb: SubjectWithDb[] = await Promise.all(
      allDefs.map(async (s) => {
        const db = dbSubjects?.find((d) => d.name === s.name) ?? null
        let chapterCount = 0
        if (db) {
          const { data: courses } = await supabase
            .from('courses').select('id').eq('subject_id', db.id)
          if (courses?.length) {
            const { count } = await supabase
              .from('chapters')
              .select('id', { count: 'exact', head: true })
              .in('course_id', courses.map((c) => c.id))
            chapterCount = count ?? 0
          }
        }
        const isRequired = config.required.some((r) => r.name === s.name)
        return { ...s, dbId: db?.id ?? null, chapterCount, isRequired }
      })
    )
    setAllSubjects(withDb)
    setLoading(false)
  }

  const toggleOptional = (name: string) => {
    setShowWarning(false)
    setOptionalSelected((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name)
      if (prev.length >= MAX_OPTIONAL) {
        setShowWarning(true)
        return prev
      }
      return [...prev, name]
    })
  }

  const handleStart = async () => {
    if (saving || !certId) return
    const config = CERT_CONFIG[certId]
    const requiredNames = config.required.map((r) => r.name)
    const combined = [...requiredNames, ...optionalSelected]

    setSaving(true)
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(combined))
    try {
      await fetch('/api/v1/selected-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_subjects: combined,
          selected_cert: certId,
          required_subjects: requiredNames,
        }),
      })
    } catch { /* ignore */ }
    router.replace('/trainer/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const config = certId ? CERT_CONFIG[certId] : null
  const requiredSubjects = allSubjects.filter((s) => s.isRequired)
  const optionalSubjects  = allSubjects.filter((s) => !s.isRequired)
  const totalSelected = requiredSubjects.length + optionalSelected.length

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      {/* 헤더 */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
        <button onClick={() => router.push('/select-cert')} className="flex items-center gap-1 text-[13px] text-[#6B6B6B] mb-3">
          <ChevronLeft size={16} /> 자격증 선택
        </button>
        <p className="text-[10px] font-bold text-[#E24B4A] tracking-widest uppercase mb-1">
          {config?.label}
        </p>
        <h1 className="text-[22px] font-black text-[#1A1A1A]">과목 선택</h1>
        <p className="text-[13px] text-[#6B6B6B] mt-1">
          선택 과목 최대 {MAX_OPTIONAL}개 &nbsp;·&nbsp;
          <span className={optionalSelected.length >= MAX_OPTIONAL ? 'text-[#E24B4A] font-bold' : 'text-[#1A1A1A] font-bold'}>
            {optionalSelected.length}/{MAX_OPTIONAL}
          </span>
        </p>
      </div>

      {showWarning && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-[#E24B4A]/10 border border-[#E24B4A]/30 rounded-xl px-3 py-2.5">
          <AlertCircle size={15} className="text-[#E24B4A] flex-shrink-0" />
          <p className="text-[12px] font-semibold text-[#E24B4A]">선택 과목은 최대 {MAX_OPTIONAL}개까지 선택 가능합니다</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-5">
        {/* 필수 과목 */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider">필수 과목</p>
            <span className="text-[10px] bg-[#1A1A1A] text-white px-2 py-0.5 rounded-full font-bold">
              {requiredSubjects.length}개
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {requiredSubjects.map((s) => (
              <div
                key={s.name}
                className="relative rounded-2xl border-2 border-[#1A1A1A] bg-[#1A1A1A]/5 p-4"
              >
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                  <Lock size={10} className="text-white" />
                </div>
                <div className="text-[26px] mb-2">{s.icon}</div>
                <div className="text-[13px] font-bold text-[#1A1A1A] leading-tight mb-1">{s.name}</div>
                <div className="text-[10px] text-[#6B6B6B] mb-2 line-clamp-2">{s.desc}</div>
                <div className="text-[10px] text-[#ADADAD]">
                  {s.chapterCount > 0 ? `${s.chapterCount}개 챕터` : '준비중'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 선택 과목 */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider">선택 과목</p>
            <span className="text-[10px] bg-[#E5E5E5] text-[#6B6B6B] px-2 py-0.5 rounded-full font-bold">
              최대 {MAX_OPTIONAL}개
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {optionalSubjects.map((s) => {
              const isSelected = optionalSelected.includes(s.name)
              const isDisabled = !isSelected && optionalSelected.length >= MAX_OPTIONAL
              return (
                <button
                  key={s.name}
                  onClick={() => toggleOptional(s.name)}
                  className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? 'border-[#E24B4A] bg-[#E24B4A]/5'
                      : isDisabled
                      ? 'border-[#E5E5E5] bg-[#F5F5F3] opacity-50'
                      : 'border-[#E5E5E5] bg-white active:bg-[#F5F5F3]'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#E24B4A] flex items-center justify-center">
                      <Check size={11} className="text-white" />
                    </div>
                  )}
                  <div className="text-[26px] mb-2">{s.icon}</div>
                  <div className="text-[13px] font-bold text-[#1A1A1A] leading-tight mb-1">{s.name}</div>
                  <div className="text-[10px] text-[#6B6B6B] mb-2 line-clamp-2">{s.desc}</div>
                  <div className="text-[10px] text-[#ADADAD]">
                    {s.chapterCount > 0 ? `${s.chapterCount}개 챕터` : '준비중'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E5E5E5]">
        <button
          onClick={handleStart}
          disabled={totalSelected === 0 || saving}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#E24B4A] disabled:opacity-40 text-white rounded-2xl text-[16px] font-bold"
        >
          {saving
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : `학습 시작 (총 ${totalSelected}과목)`
          }
        </button>
      </div>
    </div>
  )
}
