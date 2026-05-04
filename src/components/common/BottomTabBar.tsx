'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

/* ── Inline SVG icons ─────────────────────────────────────────── */
function HomeIcon({ active }: { active: boolean }) {
  const c = active ? '#111111' : '#BDBDBD'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H15v-6H9v6H4a1 1 0 0 1-1-1V10.5Z"
        fill={active ? c : 'none'}
        stroke={c}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ClassroomIcon({ active }: { active: boolean }) {
  const c = active ? '#111111' : '#BDBDBD'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="14" rx="2" stroke={c} strokeWidth="1.8" fill={active ? c : 'none'} fillOpacity={active ? 0.12 : 0} />
      <path d="M8 8h8M8 12h5" stroke={active ? '#111111' : c} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 20h10" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ReportIcon({ active }: { active: boolean }) {
  const c = active ? '#111111' : '#BDBDBD'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={c} strokeWidth="1.8" fill={active ? c : 'none'} fillOpacity={active ? 0.1 : 0} />
      <path d="M8 16v-4M12 16v-7M16 16v-2" stroke={active ? '#111111' : c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  const c = active ? '#111111' : '#BDBDBD'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="3.5" stroke={c} strokeWidth="1.8" fill={active ? c : 'none'} fillOpacity={active ? 0.15 : 0} />
      <path d="M4 20c0-4 3.582-6 8-6s8 2 8 6" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/* ── Tab definitions ──────────────────────────────────────────── */
const TABS = [
  { id: 'home',      label: '홈',    Icon: HomeIcon      },
  { id: 'classroom', label: '강의실', Icon: ClassroomIcon },
  { id: 'report',    label: '리포트', Icon: ReportIcon    },
  { id: 'profile',   label: '내정보', Icon: ProfileIcon   },
] as const

type TabId = typeof TABS[number]['id']

/* ── Inner component (uses useSearchParams) ───────────────────── */
function BottomTabBarInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get('tab') ?? 'home') as TabId

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => router.push(`/trainer/dashboard?tab=${id}`)}
              className="flex flex-col items-center gap-1 flex-1 py-2 transition-opacity active:opacity-60"
            >
              <Icon active={isActive} />
              <span className={`text-[10px] font-medium transition-colors duration-150 ${
                isActive ? 'text-[#111111]' : 'text-[#BDBDBD]'
              }`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/* ── Export with Suspense (required for useSearchParams in App Router) */
export default function BottomTabBar() {
  return (
    <Suspense fallback={
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 h-16" />
    }>
      <BottomTabBarInner />
    </Suspense>
  )
}
