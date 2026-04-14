'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { PhoneFrame, StatusBar, Header, ProgressStrip, Footer, ImagePlaceholder } from '@/components/common'
import { ChevronDown, CheckCircle2, Circle } from 'lucide-react'

type LearningLevel = 'beginner' | 'intermediate' | 'advanced'

const LEVEL_CONFIG: Record<LearningLevel, { label: string; color: string; desc: string }> = {
  beginner: { label: '🟢 초급', color: '#639922', desc: '형광펜 + 체크리스트' },
  intermediate: { label: '🟡 중급', color: '#E2A84A', desc: '체크리스트만' },
  advanced: { label: '🔵 고급', color: '#378ADD', desc: '자동 진행' },
}

function S0Content({ level, setLevel }: { level: LearningLevel; setLevel: (l: LearningLevel) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const questions = [
    { id: 'q1', text: '해부학 지식 수준은?', options: ['거의 없음', '기본 수준', '심화 학습'] },
    { id: 'q2', text: '마사지 실습 경험은?', options: ['없음', '가끔 해봄', '자주 함'] },
    { id: 'q3', text: '스트레칭 지도 경험은?', options: ['없음', '가끔', '정기적으로'] },
  ]

  return (
    <div className="space-y-5">
      <div className="bg-[#FFF9E6] border border-[#FFE066] rounded-xl p-4">
        <div className="text-[13px] font-semibold text-[#1A1A1A] mb-1">학습 전 짧은 서베이</div>
        <div className="text-[12px] text-[#6B6B6B]">답변에 따라 최적 학습 난이도가 자동 설정됩니다</div>
      </div>
      {questions.map((q) => (
        <div key={q.id}>
          <div className="text-[14px] font-semibold text-[#1A1A1A] mb-2">{q.text}</div>
          <div className="space-y-2">
            {q.options.map((opt) => (
              <button
                key={opt}
                onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-[13px] transition-all ${
                  answers[q.id] === opt
                    ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                    : 'border-[#E5E5E5] bg-[#F5F5F3] text-[#1A1A1A]'
                }`}
              >
                {answers[q.id] === opt ? <CheckCircle2 size={16} /> : <Circle size={16} className="text-[#CCCCCC]" />}
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}
      {/* Level override */}
      <div>
        <div className="text-[13px] font-semibold text-[#1A1A1A] mb-2">학습 난이도 직접 설정</div>
        <div className="flex gap-2">
          {(Object.keys(LEVEL_CONFIG) as LearningLevel[]).map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`flex-1 py-2.5 rounded-xl text-[12px] font-medium border transition-all ${
                level === l ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white' : 'border-[#E5E5E5] bg-[#F5F5F3] text-[#1A1A1A]'
              }`}
            >
              {LEVEL_CONFIG[l].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function S1Content({ level }: { level: LearningLevel }) {
  const [checked, setChecked] = useState<string[]>([])
  const items = [
    '하지 교차증후군은 골반 주변 근육의 불균형으로 발생',
    '단축근: 장요근, 대퇴직근, 척추기립근',
    '약화근: 대둔근, 복근, 심부 경추굴곡근',
    '주요 증상: 요통, 전방 골반 경사, 무릎 통증',
    '운동 목표: 단축근 이완 + 약화근 활성화',
  ]

  return (
    <div className="space-y-4">
      <ImagePlaceholder width={600} height={400} label="하지 교차증후군 다이어그램" />
      <div className="bg-[#F5F5F3] rounded-xl p-4 space-y-2">
        <div className="text-[13px] font-bold text-[#1A1A1A] mb-3">핵심 개념</div>
        {items.map((item, i) => {
          const id = `s1-${i}`
          const done = checked.includes(id)
          return (
            <button
              key={id}
              onClick={() => setChecked((prev) => done ? prev.filter((x) => x !== id) : [...prev, id])}
              className={`w-full flex items-start gap-3 text-left p-2 rounded-lg ${done ? 'opacity-60' : ''}`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                done ? 'bg-[#639922] border-[#639922]' : 'border-[#CCCCCC]'
              }`}>
                {done && <span className="text-white text-[9px]">✓</span>}
              </div>
              <span className={`text-[13px] leading-relaxed ${
                level === 'beginner'
                  ? `${done ? 'text-[#ADADAD]' : 'text-[#1A1A1A]'} ${!done ? 'bg-[#FFE066]/40' : ''} rounded`
                  : 'text-[#1A1A1A]'
              }`}>
                {item}
              </span>
            </button>
          )
        })}
      </div>
      <div className="bg-[#F5F5F3] rounded-xl p-4">
        <div className="text-[12px] font-semibold text-[#6B6B6B] mb-2">관련 근육 그룹</div>
        <div className="grid grid-cols-2 gap-2">
          {[['🔴 단축 (타이트)', ['장요근', '대퇴직근', '척추기립근']], ['🔵 약화 (약함)', ['대둔근', '복근', '경추굴곡근']]].map(([label, muscles], i) => (
            <div key={i} className="bg-white rounded-xl p-3 border border-[#E5E5E5]">
              <div className="text-[11px] font-semibold text-[#6B6B6B] mb-2">{label as string}</div>
              {(muscles as string[]).map((m) => (
                <div key={m} className="text-[12px] text-[#1A1A1A] py-0.5">· {m}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function S2Content() {
  const muscles = [
    { name: '장요근 (Iliopsoas)', origin: '요추 1-5번, 장골', insertion: '대퇴골 소전자' },
    { name: '대퇴직근 (Rectus Femoris)', origin: '전하장골극', insertion: '슬개골, 경골 조면' },
    { name: '대둔근 (Gluteus Maximus)', origin: '장골 후면, 천골', insertion: '대퇴골 둔근조면' },
  ]
  return (
    <div className="space-y-4">
      <ImagePlaceholder width={400} height={500} label="해부학 3D 모델 (인터랙티브)" />
      <div className="text-[12px] text-[#ADADAD] text-center">탭하여 근육 선택</div>
      {muscles.map((m) => (
        <div key={m.name} className="bg-[#F5F5F3] rounded-xl p-4 border border-[#E5E5E5]">
          <div className="text-[14px] font-bold text-[#1A1A1A] mb-2">{m.name}</div>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div>
              <div className="text-[#ADADAD] mb-0.5">기시</div>
              <div className="text-[#1A1A1A]">{m.origin}</div>
            </div>
            <div>
              <div className="text-[#ADADAD] mb-0.5">정지</div>
              <div className="text-[#1A1A1A]">{m.insertion}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function S3_1Content() {
  return (
    <div className="space-y-4">
      <div className="bg-[#E24B4A]/10 border border-[#E24B4A]/30 rounded-xl p-4">
        <div className="text-[13px] font-semibold text-[#E24B4A] mb-1">마사지 Tutorial</div>
        <div className="text-[12px] text-[#6B6B6B]">올바른 자세와 압력 포인트를 학습합니다</div>
      </div>
      <ImagePlaceholder width={600} height={360} label="마사지 Tutorial 영상" />
      <div className="space-y-3">
        {['손 위치 — 장요근 접근 포인트', '압력 조절 — 3단계 피드백', '호흡 리듬 — 내쉬며 압력 증가', '금기 확인 — 포인트 체크'].map((tip, i) => (
          <div key={i} className="flex items-start gap-3 bg-[#F5F5F3] rounded-xl px-4 py-3">
            <span className="text-[13px] font-bold text-[#E24B4A] w-5 flex-shrink-0">{i + 1}.</span>
            <span className="text-[13px] text-[#1A1A1A]">{tip}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function S3_2Content() {
  const [step, setStep] = useState<'supine' | 'prone'>('supine')
  const STEPS = {
    supine: [
      { id: 1, name: '장요근 직접 마사지', duration: '2분', done: false },
      { id: 2, name: '대퇴직근 마사지 (바로 누운 자세)', duration: '1분 30초', done: false },
      { id: 3, name: 'IT 밴드 마사지', duration: '1분', done: false },
    ],
    prone: [
      { id: 4, name: '척추기립근 마사지 (엎드린 자세)', duration: '2분', done: false },
      { id: 5, name: '대퇴이두근 마사지', duration: '1분 30초', done: false },
    ],
  }

  const [doneItems, setDoneItems] = useState<number[]>([])

  return (
    <div className="space-y-4">
      {/* Position toggle */}
      <div className="flex bg-[#F5F5F3] rounded-xl p-1 gap-1">
        {(['supine', 'prone'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setStep(p)}
            className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
              step === p ? 'bg-white shadow-sm text-[#1A1A1A]' : 'text-[#ADADAD]'
            }`}
          >
            {p === 'supine' ? '🔄 Supine (바로 눕기)' : '🔄 Prone (엎드리기)'}
          </button>
        ))}
      </div>

      <ImagePlaceholder width={600} height={340} label={`${step === 'supine' ? '바로 누운' : '엎드린'} 자세 마사지`} />

      <div className="space-y-2">
        {STEPS[step].map((item) => {
          const done = doneItems.includes(item.id)
          return (
            <button
              key={item.id}
              onClick={() => setDoneItems((prev) => done ? prev.filter((x) => x !== item.id) : [...prev, item.id])}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
                done ? 'bg-[#639922]/10 border-[#639922]/30' : 'bg-[#F5F5F3] border-[#E5E5E5]'
              }`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                done ? 'bg-[#639922] border-[#639922]' : 'border-[#CCCCCC]'
              }`}>
                {done && <span className="text-white text-[11px]">✓</span>}
              </div>
              <div className="flex-1 text-left">
                <div className={`text-[14px] font-medium ${done ? 'text-[#ADADAD] line-through' : 'text-[#1A1A1A]'}`}>{item.name}</div>
                <div className="text-[11px] text-[#ADADAD]">{item.duration}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function S5Content() {
  const [testSize, setTestSize] = useState<5 | 10 | 20 | 'all' | null>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<boolean[]>([])

  const QUESTIONS = [
    {
      q: '하지 교차증후군에서 단축되는 근육은?',
      options: ['대둔근', '장요근', '복근', '경추굴곡근'],
      correct: 1,
    },
    {
      q: '마사지 시 올바른 호흡 타이밍은?',
      options: ['들이마실 때 압력', '내쉴 때 압력', '호흡과 무관', '멈출 때 압력'],
      correct: 1,
    },
    {
      q: '패시브 스트레칭에서 유지 시간은?',
      options: ['5~10초', '15~20초', '30~60초', '2분 이상'],
      correct: 2,
    },
  ]

  if (!testSize) {
    return (
      <div className="space-y-4">
        <div className="text-[14px] text-[#6B6B6B] text-center">문제 수를 선택하세요</div>
        <div className="grid grid-cols-2 gap-3">
          {([5, 10, 20, 'all'] as const).map((n) => (
            <button
              key={n}
              onClick={() => setTestSize(n)}
              className="py-5 bg-[#F5F5F3] rounded-2xl border border-[#E5E5E5] text-[16px] font-bold text-[#1A1A1A]"
            >
              {n === 'all' ? '전체' : `${n}문제`}
            </button>
          ))}
        </div>
        <button className="w-full py-3 border border-dashed border-[#CCCCCC] rounded-xl text-[14px] text-[#ADADAD]">
          건너뛰기
        </button>
      </div>
    )
  }

  if (currentQ >= QUESTIONS.length) {
    const score = answers.filter(Boolean).length
    return (
      <div className="text-center space-y-5">
        <div className="text-[48px]">{score >= 2 ? '🎉' : '📖'}</div>
        <div className="text-[22px] font-bold text-[#1A1A1A]">{score} / {QUESTIONS.length}</div>
        <div className="text-[14px] text-[#6B6B6B]">{score >= 2 ? '잘 하셨습니다!' : '다시 학습해보세요'}</div>
        <div className="w-full h-3 bg-[#F5F5F3] rounded-full overflow-hidden">
          <div className="h-full bg-[#E24B4A] rounded-full" style={{ width: `${(score / QUESTIONS.length) * 100}%` }} />
        </div>
      </div>
    )
  }

  const q = QUESTIONS[currentQ]
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[12px] text-[#ADADAD]">
        <span>{currentQ + 1} / {QUESTIONS.length}</span>
        <span>{Math.round(((currentQ) / QUESTIONS.length) * 100)}%</span>
      </div>
      <div className="w-full h-1.5 bg-[#F5F5F3] rounded-full">
        <div className="h-full bg-[#E24B4A] rounded-full transition-all" style={{ width: `${(currentQ / QUESTIONS.length) * 100}%` }} />
      </div>
      <div className="text-[16px] font-semibold text-[#1A1A1A] leading-relaxed">{q.q}</div>
      <div className="space-y-2">
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`w-full px-4 py-3.5 rounded-xl border text-left text-[14px] transition-all ${
              selected === i
                ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                : 'border-[#E5E5E5] bg-[#F5F5F3] text-[#1A1A1A]'
            }`}
          >
            <span className="text-[#ADADAD] mr-2">{String.fromCharCode(65 + i)}.</span>
            {opt}
          </button>
        ))}
      </div>
      <button
        disabled={selected === null}
        onClick={() => {
          setAnswers((prev) => [...prev, selected === q.correct])
          setSelected(null)
          setCurrentQ((n) => n + 1)
        }}
        className="w-full py-3.5 bg-[#1A1A1A] disabled:opacity-40 text-white rounded-xl text-[14px] font-semibold"
      >
        확인
      </button>
    </div>
  )
}

function S6Content() {
  return (
    <div className="space-y-4">
      <div className="bg-[#639922]/10 border border-[#639922]/30 rounded-xl p-5 text-center">
        <div className="text-[40px] mb-2">🎓</div>
        <div className="text-[18px] font-bold text-[#1A1A1A] mb-1">하지 챕터 완료!</div>
        <div className="text-[13px] text-[#6B6B6B]">수료증이 발급되었습니다</div>
      </div>
      <div className="bg-[#F5F5F3] rounded-xl p-4 space-y-3">
        <div className="text-[13px] font-bold text-[#1A1A1A]">학습 결과 요약</div>
        {[
          { label: '총 학습 시간', value: '2시간 34분' },
          { label: '테스트 점수', value: '85점 / 100점' },
          { label: '취약 근육', value: '장요근, 대퇴직근' },
          { label: '완료일', value: new Date().toLocaleDateString('ko-KR') },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between text-[13px]">
            <span className="text-[#6B6B6B]">{item.label}</span>
            <span className="font-semibold text-[#1A1A1A]">{item.value}</span>
          </div>
        ))}
      </div>
      <div className="bg-[#FFF9E6] border border-[#FFE066] rounded-xl p-4">
        <div className="text-[12px] font-semibold text-[#1A1A1A] mb-2">💡 취약 포인트 보완 추천</div>
        <p className="text-[12px] text-[#6B6B6B] leading-relaxed">
          장요근과 대퇴직근 마사지 기법을 더 연습해보세요. S3.2 실기를 다시 학습하거나 동료와 실습해보는 것을 추천합니다.
        </p>
      </div>
    </div>
  )
}

const SECTION_CONFIGS: Record<string, { title: string; step: number; skippable: boolean }> = {
  's0': { title: 'S0 — 온보딩 서베이', step: 0, skippable: false },
  's1': { title: 'S1 — 하지 교차증후군 개요', step: 1, skippable: true },
  's2': { title: 'S2 — 타겟 근육 해부학', step: 2, skippable: true },
  's3-1': { title: 'S3.1 — 마사지 Tutorial', step: 3, skippable: true },
  's3-2': { title: 'S3.2 — 마사지 실기', step: 4, skippable: false },
  's4-1': { title: 'S4.1 — 스트레칭 Tutorial', step: 5, skippable: true },
  's4-2': { title: 'S4.2 — 스트레칭 실기', step: 6, skippable: false },
  's5': { title: 'S5 — Test', step: 7, skippable: true },
  's6': { title: 'S6 — 결과 리포팅', step: 8, skippable: true },
}

const SECTION_ORDER = ['s0', 's1', 's2', 's3-1', 's3-2', 's4-1', 's4-2', 's5', 's6']

export default function EducationSectionPage() {
  const router = useRouter()
  const params = useParams()
  const sectionId = (params.section as string) ?? 's0'
  const [level, setLevel] = useState<LearningLevel>('beginner')
  const [showLevelDrop, setShowLevelDrop] = useState(false)

  const config = SECTION_CONFIGS[sectionId] ?? SECTION_CONFIGS['s0']
  const currentIdx = SECTION_ORDER.indexOf(sectionId)
  const nextSection = SECTION_ORDER[currentIdx + 1]

  const renderContent = () => {
    switch (sectionId) {
      case 's0': return <S0Content level={level} setLevel={setLevel} />
      case 's1': return <S1Content level={level} />
      case 's2': return <S2Content />
      case 's3-1': return <S3_1Content />
      case 's3-2': return <S3_2Content />
      case 's4-1': return (
        <div className="space-y-4">
          <ImagePlaceholder width={600} height={360} label="패시브 스트레칭 Tutorial 영상" />
          <div className="space-y-3">
            {['스트레칭 원칙 — 통증 없는 범위', '유지 시간 — 30~60초', '호흡 — 천천히 깊게', '회수 — 2~3회 반복'].map((tip, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#F5F5F3] rounded-xl px-4 py-3">
                <span className="text-[13px] font-bold text-[#378ADD]">{i + 1}.</span>
                <span className="text-[13px] text-[#1A1A1A]">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )
      case 's4-2': return (
        <div className="space-y-4">
          <ImagePlaceholder width={600} height={360} label="패시브 스트레칭 실기" />
          {['장요근 스트레칭 (Supine)', '대퇴직근 스트레칭 (Prone)', '햄스트링 스트레칭', '이상근 스트레칭'].map((s, i) => (
            <div key={i} className="flex items-center gap-3 bg-[#F5F5F3] rounded-xl px-4 py-3.5 border border-[#E5E5E5]">
              <Circle size={18} className="text-[#CCCCCC] flex-shrink-0" />
              <span className="text-[14px] text-[#1A1A1A]">{s}</span>
              <span className="text-[11px] text-[#ADADAD] ml-auto">30-60초</span>
            </div>
          ))}
        </div>
      )
      case 's5': return <S5Content />
      case 's6': return <S6Content />
      default: return <div className="text-center text-[#ADADAD] py-10">콘텐츠 준비 중</div>
    }
  }

  return (
    <PhoneFrame>
      <div className="flex flex-col bg-white" style={{ minHeight: '812px' }}>
        <StatusBar />
        <Header
          title={config.title}
          leftAction="back"
          onBack={() => router.push('/trainer/education')}
          rightAction={
            config.skippable ? (
              <button
                onClick={() => router.push(nextSection ? `/trainer/education/${nextSection}` : '/trainer/education')}
                className="text-[12px] text-[#6B6B6B] font-medium"
              >
                건너뛰기
              </button>
            ) : undefined
          }
        />
        <ProgressStrip current={config.step + 1} total={9} />

        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 pb-6">
          {renderContent()}
        </div>

        {/* Level Dropdown (S1~S4) */}
        {['s1', 's2', 's3-1', 's3-2', 's4-1', 's4-2'].includes(sectionId) && (
          <div className="bg-white border-t border-[#E5E5E5] px-4 py-2">
            <button
              onClick={() => setShowLevelDrop(!showLevelDrop)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-[#1A1A1A]">{LEVEL_CONFIG[level].label}</span>
                <span className="text-[11px] text-[#ADADAD]">— {LEVEL_CONFIG[level].desc}</span>
              </div>
              <ChevronDown size={16} className={`text-[#ADADAD] transition-transform ${showLevelDrop ? 'rotate-180' : ''}`} />
            </button>
            {showLevelDrop && (
              <div className="mt-2 space-y-1 pb-1">
                {(Object.keys(LEVEL_CONFIG) as LearningLevel[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => { setLevel(l); setShowLevelDrop(false) }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-[13px] ${
                      level === l ? 'bg-[#1A1A1A] text-white' : 'text-[#1A1A1A] hover:bg-[#F5F5F3]'
                    }`}
                  >
                    {LEVEL_CONFIG[l].label} — {LEVEL_CONFIG[l].desc}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <Footer
          onBack={() => router.push('/trainer/education')}
          onNext={() => {
            if (nextSection) router.push(`/trainer/education/${nextSection}`)
            else router.push('/trainer/education')
          }}
          nextLabel={nextSection ? '다음' : '완료'}
          hideBack={sectionId === 's0'}
          center={<span className="text-[12px] text-[#ADADAD]">{config.step + 1} / 9</span>}
        />
      </div>
    </PhoneFrame>
  )
}
