'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'

interface Chapter {
  id: string
  name: string
  description: string | null
  order_num: number | null
}

interface Subject {
  id: string
  name: string
}

export default function ChaptersPage() {
  const { status } = useSession()
  const router = useRouter()
  const params = useParams()
  const subjectId = params.subjectId as string

  const [subject, setSubject] = useState<Subject | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    fetchData()
  }, [status, subjectId])

  const fetchData = async () => {
    const [{ data: subjectData }, { data: chapterData }] = await Promise.all([
      supabase.from('subjects').select('id, name').eq('id', subjectId).single(),
      supabase.from('chapters').select('id, name, description, order_num').eq('subject_id', subjectId).order('order_num', { ascending: true }),
    ])
    setSubject(subjectData ?? null)
    setChapters(chapterData ?? [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      {/* 헤더 */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-[13px] text-[#6B6B6B] mb-3">
          <ChevronLeft size={16} /> 과목 목록
        </button>
        <h1 className="text-[22px] font-black text-[#1A1A1A]">{subject?.name ?? '챕터 목록'}</h1>
        <p className="text-[13px] text-[#6B6B6B] mt-1">{chapters.length}개 챕터</p>
      </div>

      <div className="p-4 space-y-2">
        {chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen size={40} className="text-[#ADADAD] mb-3" />
            <p className="text-[14px] text-[#ADADAD]">등록된 챕터가 없습니다</p>
          </div>
        ) : (
          chapters.map((ch, idx) => (
            <button
              key={ch.id}
              onClick={() => router.push(`/lesson/${ch.id}`)}
              className="w-full bg-white rounded-2xl border border-[#E5E5E5] p-4 text-left flex items-center gap-4 active:bg-[#F5F5F3]"
            >
              <div className="w-9 h-9 rounded-xl bg-[#E24B4A]/10 flex items-center justify-center text-[14px] font-black text-[#E24B4A] flex-shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-[#1A1A1A] truncate">{ch.name}</div>
                {ch.description && (
                  <div className="text-[12px] text-[#6B6B6B] mt-0.5 truncate">{ch.description}</div>
                )}
              </div>
              <ChevronRight size={16} className="text-[#ADADAD] flex-shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  )
}
