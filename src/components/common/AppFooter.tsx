import Link from 'next/link'

// ================================================================
// AppFooter — 모든 페이지 하단 공통 푸터
// ================================================================

interface AppFooterProps {
  dark?: boolean  // 다크 배경 페이지용
}

export function AppFooter({ dark = false }: AppFooterProps) {
  const textColor = dark ? 'text-white/40' : 'text-[#ADADAD]'
  const linkColor = dark ? 'text-white/50 hover:text-white/80' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
  const borderColor = dark ? 'border-white/10' : 'border-[#E5E5E5]'
  const bg = dark ? 'bg-transparent' : 'bg-[#F5F5F3]'

  return (
    <footer className={`${bg} border-t ${borderColor} px-6 py-6`}>
      <div className="max-w-md mx-auto">
        {/* Brand */}
        <div className={`text-[15px] font-black mb-0.5 ${dark ? 'text-white' : 'text-[#1A1A1A]'}`}>
          Kinepia
        </div>
        <div className={`text-[11px] mb-4 ${textColor}`}>
          움직임의 원리를 배우는 지식 플랫폼
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
          <Link
            href="/privacy"
            className={`text-[12px] transition-colors ${linkColor}`}
          >
            개인정보처리방침
          </Link>
          <Link
            href="/terms"
            className={`text-[12px] transition-colors ${linkColor}`}
          >
            이용약관
          </Link>
          <a
            href="mailto:privacy@kinepia.io"
            className={`text-[12px] transition-colors ${linkColor}`}
          >
            문의
          </a>
        </div>

        {/* Copyright + Version */}
        <div className={`flex items-center justify-between text-[10px] ${textColor}`}>
          <span>© 2026 Kinepia. All rights reserved.</span>
          <span>v0.1.0</span>
        </div>
      </div>
    </footer>
  )
}
