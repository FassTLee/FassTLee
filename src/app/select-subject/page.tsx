'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Check, AlertCircle } from 'lucide-react'

const SUBJECTS_KEY = 'kinepia_selected_subjects'
const MAX_SELECT = 5

// 건강운동관리사 8개 과목 (순서 고정)
const MVP_SUBJECTS = [
  { name: '운동생리학',   icon: '🫀', desc: '심폐기능, 에너지 대사, 운동 적응' },
  { name: '기능해부학',   icon: '🦴', desc: '근육·뼈대·관절의 기능과 구조' },
  { name: '건강·체력평가', icon: '📊', desc: '체력검사, 측정 방법, 평가 기준' },
  { name: '운동처방론',   icon: '📋', desc: 'FITT 원칙, 대상별 운동 처방' },
  { name: '운동부하검사', icon: '🏃', desc: '심전도, 운동부하 프로토콜' },
  { name: '운동상해',     icon: '🩹', desc: '스포츠 손상, 응급처치, 재활' },
  { name: '병태생리학',   icon: '🔬', desc: '질환의 발생 원리와 병태 기전' },
  { name: '스포츠심리학', icon: '🧠', desc: '동기, 루틴, 심리기술 훈련' },
]

interface SubjectWithId {
  name: string
  icon: string
  desc: string
  dbId: string | null
  chapterCount: number
}

export default function SelectSubjectPage() {
  const { status } = useSession()
  const router = useRouter()
  const [subjects, setSubjects] = useState<SubjectWithId[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [showWarning, setShowWarning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    init()
  }, [status, router])

  const init = async () => {
    // 기존 선택 복원 (localStorage 우선)
    const cached = localStorage.getItem(SUBJECTS_KEY)
    if (cached) {
      try { setSelected(JSON.parse(cached)) } catch { /* ignore */ }
    } else {
      // DB에서 불러오기
      try {
        const res = await fetch('/api/v1/selected-subjects')
        const data = await res.json()
        if (Array.isArray(data.selected_subjects) && data.selected_subjects.length > 0) {
          setSelected(data.selected_subjects)
          localStorage.setItem(SUBJECTS_KEY, JSON.stringify(data.selected_subjects))
        }
      } catch { /* ignore */ }
    }

    // Supabase에서 subject ID + chapter count 조회
    const { data: dbSubjects } = await supabase
      .from('subjects')
      .select('id, name')

    const withIds: SubjectWithId[] = await Promise.all(
      MVP_SUBJECTS.map(async (s) => {
        const db = dbSubjects?.find((d) => d.name === s.name) ?? null
        let chapterCount = 0
        if (db) {
          const { data: courses } = await supabase
            .from('courses')
            .select('id')
            .eq('subject_id', db.id)
          if (courses?.length) {
            const courseIds = courses.map((c) => c.id)
            const { count } = await supabase
              .from('chapters')
              .select('id', { count: 'exact', head: true })
              .in('course_id', courseIds)
            chapterCount = count ?? 0
          }
        }
        return { ...s, dbId: db?.id ?? null, chapterCount }
      })
    )
    setSubjects(withIds)
    setLoading(false)
  }

  const toggleSubject = (name: string) => {
    setShowWarning(false)
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name)
      if (prev.length >= MAX_SELECT) {
        setShowWarning(true)
        return prev
      }
      return [...prev, name]
    })
  }

  const handleStart = async () => {
    if (selected.length === 0 || saving) return
    setSaving(true)
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(selected))
    try {
      await fetch('/api/v1/selected-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_subjects: selected }),
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

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      {/* 헤더 */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
        <p className="text-[10px] font-bold text-[#E24B4A] tracking-widest uppercase mb-1">건강운동관리사</p>
        <h1 className="text-[22px] font-black text-[#1A1A1A]">수강 과목 선택</h1>
        <p className="text-[13px] text-[#6B6B6B] mt-1">
          최대 {MAX_SELECT}개까지 선택 가능 &nbsp;·&nbsp;
          <span className={selected.length >= MAX_SELECT ? 'text-[#E24B4A] font-bold' : 'text-[#1A1A1A] font-bold'}>
            {selected.length}/{MAX_SELECT}
          </span>
        </p>
      </div>

      {/* 경고 메시지 */}
      {showWarning && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-[#E24B4A]/10 border border-[#E24B4A]/30 rounded-xl px-3 py-2.5">
          <AlertCircle size={15} className="text-[#E24B4A] flex-shrink-0" />
          <p className="text-[12px] font-semibold text-[#E24B4A]">최대 {MAX_SELECT}개까지 선택 가능합니다</p>
        </div>
      )}

      {/* 과목 그리드 */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="grid grid-cols-2 gap-3">
          {subjects.map((s) => {
            const isSelected = selected.includes(s.name)
            const isDisabled = !isSelected && selected.length >= MAX_SELECT
            return (
              <button
                key={s.name}
                onClick={() => toggleSubject(s.name)}
                className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? 'border-[#E24B4A] bg-[#E24B4A]/5'
                    : isDisabled
                    ? 'border-[#E5E5E5] bg-[#F5F5F3] opacity-50'
                    : 'border-[#E5E5E5] bg-white active:bg-[#F5F5F3]'
                }`}
              >
                {/* 체크 표시 */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#E24B4A] flex items-center justify-center">
                    <Check size={11} className="text-white" />
                  </div>
                )}
                <div className="text-[28px] mb-2">{s.icon}</div>
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

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E5E5E5]">
        <button
          onClick={handleStart}
          disabled={selected.length === 0 || saving}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#E24B4A] disabled:opacity-40 text-white rounded-2xl text-[16px] font-bold transition-all"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            `학습 시작 (${selected.length}개 선택)`
          )}
        </button>
      </div>
    </div>
  )
}
