'use client'

import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const TABS = [
  { label: '홈',    id: 'home',      icon: 'home'      },
  { label: '강의실', id: 'classroom', icon: 'classroom' },
  { label: '리포트', id: 'report',    icon: 'report'    },
  { label: '내정보', id: 'profile',   icon: 'profile'   },
] as const

type TabId = typeof TABS[number]['id']

function BottomTabBarInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get('tab') ?? 'home') as TabId

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const iconSrc = `/assets/icons/tab/tab-${tab.icon}-${isActive ? 'active' : 'inactive'}.svg`

          return (
            <button
              key={tab.id}
              onClick={() => router.push(`/trainer/dashboard?tab=${tab.id}`)}
              className="flex flex-col items-center gap-1 flex-1 py-2 transition-opacity active:opacity-60"
            >
              <Image
                src={iconSrc}
                alt={tab.label}
                width={28}
                height={28}
                className="transition-opacity duration-150"
              />
              <span
                className={`text-[10px] font-medium transition-colors duration-150 ${
                  isActive ? 'text-[#111111]' : 'text-[#BDBDBD]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default function BottomTabBar() {
  return (
    <Suspense fallback={
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 h-16" />
    }>
      <BottomTabBarInner />
    </Suspense>
  )
}
