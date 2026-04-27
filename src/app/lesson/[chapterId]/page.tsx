'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, Zap, BookOpen } from 'lucide-react'

const STYLE_KEY = 'kinepia_learning_style'

interface Chapter {
  id: string
  title: string
  course_id: string
}

interface Question {
  id: string
  question: string
  options: string[]
  answer_index: number
  explanation: string | null
}

function getTwoSentences(text: string): string {
  const sentences = text.match(/[^.!?。]+[.!?。]?/g) ?? []
  return sentences.slice(0, 2).join('').trim()
}

function extractKeywords(questions: Question[]): string[] {
  return questions
    .slice(0, 5)
    .map((q) => {
      const words = q.question.replace(/[?？]/g, '').split(/[\s,]+/)
      return words.find((w) => w.length >= 3) ?? words[0] ?? ''
    })
    .filter(Boolean)
}

export default function LessonPage() {
  const { status } = useSession()
  const router = useRouter()
  const params = useParams()
  const chapterId = params.chapterId as string

  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [courseDesc, setCourseDesc] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [style, setStyle] = useState<'memorizer' | 'conceptualizer'>('conceptualizer')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    const saved = localStorage.getItem(STYLE_KEY) as 'memorizer' | 'conceptualizer' | null
    if (saved) setStyle(saved)
    fetchData()
  }, [status, chapterId])

  const fetchData = async () => {
    const [{ data: ch }, { data: qs }] = await Promise.all([
      supabase.from('chapters').select('id, title, course_id').eq('id', chapterId).single(),
      supabase.from('chapter_questions').select('id, question, options, answer_index, explanation').eq('chapter_id', chapterId),
    ])
    setChapter(ch ?? null)
    setQuestions(qs ?? [])

    if (ch?.course_id) {
      const { data: course } = await supabase
        .from('courses')
        .select('description')
        .eq('id', ch.course_id)
        .single()
      setCourseDesc(course?.description ?? null)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isMemorizer = style === 'memorizer'
  const keywords = isMemorizer ? extractKeywords(questions) : []
  const previewQuestions = isMemorizer ? questions.slice(0, 3) : questions.slice(0, 5)

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-[13px] text-[#6B6B6B] mb-3">
          <ChevronLeft size={16} /> 뒤로
        </button>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={isMemorizer
              ? { backgroundColor: '#378ADD20', color: '#378ADD' }
              : { backgroundColor: '#63992220', color: '#639922' }}
          >
            {isMemorizer ? '🧠 암기형' : '💡 이해형'}
          </span>
        </div>
        <h1 className="text-[20px] font-black text-[#1A1A1A]">{chapter?.title ?? '레슨'}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {/* 개요 */}
        {courseDesc && (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
            <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">개요</p>
            <p className="text-[14px] text-[#1A1A1A] leading-relaxed">
              {isMemorizer ? getTwoSentences(courseDesc) : courseDesc}
            </p>
          </div>
        )}

        {/* 암기형 키워드 */}
        {isMemorizer && keywords.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
            <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-3">핵심 키워드</p>
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw, i) => (
                <span key={i} className="px-3 py-1.5 rounded-xl text-[13px] font-bold" style={{ backgroundColor: '#378ADD15', color: '#378ADD' }}>
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 학습 내용 */}
        {previewQuestions.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider px-1">
              {isMemorizer ? '핵심 개념 요약' : '학습 내용'}
            </p>
            {previewQuestions.map((q, i) => (
              <div key={q.id} className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#E24B4A]/10 flex items-center justify-center text-[11px] font-black text-[#E24B4A] flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1A1A] mb-2">{q.question}</p>
                    {q.explanation && (
                      <p className="text-[12px] text-[#6B6B6B] leading-relaxed">
                        {isMemorizer ? getTwoSentences(q.explanation) : q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {questions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen size={36} className="text-[#ADADAD] mb-3" />
            <p className="text-[13px] text-[#ADADAD]">학습 내용 준비 중입니다</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E5E5E5]">
        <button
          onClick={() => router.push(`/test/${chapterId}`)}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#E24B4A] text-white rounded-2xl text-[16px] font-bold"
        >
          <Zap size={18} /> 테스트 시작
        </button>
      </div>
    </div>
  )
}
