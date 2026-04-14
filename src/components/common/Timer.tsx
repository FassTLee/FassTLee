'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Square } from 'lucide-react'

interface TimerProps {
  timerKey?: string
  onStop?: (seconds: number) => void
  compact?: boolean
}

export function Timer({ onStop, compact = false }: TimerProps) {
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const handleStop = () => {
    setRunning(false)
    onStop?.(seconds)
    setSeconds(0)
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] font-mono text-[#1A1A1A] w-10">{fmt(seconds)}</span>
        <button
          onClick={() => setRunning(!running)}
          className="w-6 h-6 rounded-full bg-[#F5F5F3] flex items-center justify-center"
        >
          {running ? <Pause size={10} /> : <Play size={10} />}
        </button>
        <button
          onClick={handleStop}
          className="w-6 h-6 rounded-full bg-[#F5F5F3] flex items-center justify-center"
        >
          <Square size={10} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-[#F5F5F3] rounded-lg px-3 py-2">
      <span className="text-[15px] font-mono font-semibold text-[#1A1A1A] w-12">{fmt(seconds)}</span>
      <button
        onClick={() => setRunning(!running)}
        className="flex items-center gap-1 text-[12px] font-medium text-[#1A1A1A] bg-white rounded px-2 py-1 border border-[#E5E5E5]"
      >
        {running ? <><Pause size={12} /> 일시정지</> : <><Play size={12} /> 시작</>}
      </button>
      <button
        onClick={handleStop}
        className="flex items-center gap-1 text-[12px] font-medium text-[#6B6B6B] bg-white rounded px-2 py-1 border border-[#E5E5E5]"
      >
        <Square size={12} /> 종료
      </button>
    </div>
  )
}
