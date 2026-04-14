import Link from 'next/link'
import type { Metadata } from 'next'
import { AppFooter } from '@/components/common/AppFooter'

export const metadata: Metadata = {
  title: '이용약관 | FassT',
  description: 'FassT 서비스 이용약관',
}

const TERMS = [
  {
    num: '1',
    title: '목적',
    body: `본 약관은 FassT(이하 "서비스")가 제공하는 트레이너 전문 교육 플랫폼 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무·책임 사항을 규정함을 목적으로 합니다.`,
  },
  {
    num: '2',
    title: '정의',
    body: `• 서비스: FassT가 제공하는 모든 교육 콘텐츠, 게이미피케이션, 커뮤니티 기능을 포함합니다.
• 이용자: 본 약관에 동의하고 서비스를 이용하는 자.
• 콘텐츠: 서비스 내 강의, 레슨, 테스트, 이미지, 텍스트 등 모든 학습 자료.`,
  },
  {
    num: '3',
    title: '약관의 효력 및 변경',
    body: `본 약관은 서비스 화면에 게시하거나 이용자에게 통지함으로써 효력이 발생합니다. 서비스는 필요 시 약관을 변경할 수 있으며, 변경 시 7일 전 공지합니다. 변경에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.`,
  },
  {
    num: '4',
    title: '서비스 이용',
    body: `• 서비스는 Google OAuth를 통한 소셜 로그인으로 가입합니다.
• 무료(free) 플랜: 기초 해부학 일부, 일 5문제 제한, 광고 포함.
• 프로(pro) 플랜: MVP 전 과목, 무제한 학습, 광고 없음.
• 프리미엄(premium) 플랜: 전 과목, 오프라인 할인 혜택.
• 서비스는 사전 공지 후 기능을 변경·추가·중단할 수 있습니다.`,
  },
  {
    num: '5',
    title: '지적재산권',
    body: `서비스 내 모든 콘텐츠(해부학 이미지, 강의 텍스트, 디자인 등)의 저작권은 FassT에 귀속됩니다. 이용자는 개인 학습 목적으로만 콘텐츠를 열람할 수 있으며, 무단 복제·배포·수정·상업적 이용을 금합니다.`,
  },
  {
    num: '6',
    title: '이용자 의무',
    body: `이용자는 다음 행위를 해서는 안 됩니다:
• 콘텐츠 무단 복제, 배포, 캡처
• 타인의 계정 도용
• 서비스에 악성 코드 유포
• 허위 정보 등록
• 개발자 도구를 이용한 콘텐츠 추출 시도`,
  },
  {
    num: '7',
    title: '서비스 중단 및 제한',
    body: `서비스는 천재지변, 시스템 점검, 운영상 불가피한 사정으로 서비스를 일시 중단할 수 있습니다. 이용자의 약관 위반 시 서비스 이용을 제한하거나 계정을 삭제할 수 있습니다.`,
  },
  {
    num: '8',
    title: '면책 조항',
    body: `서비스는 이용자가 서비스를 통해 얻는 정보의 신뢰성, 정확성에 대해 보증하지 않습니다. 본 서비스의 학습 콘텐츠는 교육 목적으로만 제공되며, 의학적 진단이나 치료 목적으로 사용할 수 없습니다.`,
  },
  {
    num: '9',
    title: '분쟁 해결',
    body: `본 약관과 관련한 분쟁은 대한민국 법을 준거법으로 하며, 서울중앙지방법원을 제1심 전속 관할 법원으로 합니다. 분쟁 발생 시 먼저 이메일(privacy@fasst.io)로 문의해 주세요.`,
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#1A1A1A] text-white px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="text-[13px] text-white/50 hover:text-white/80 transition-colors mb-6 block"
          >
            ← FassT 홈
          </Link>
          <h1 className="text-[28px] font-black mb-2">이용약관</h1>
          <p className="text-[14px] text-white/60">시행일: 2026년 4월 14일</p>
        </div>
      </div>

      {/* Notice */}
      <div className="bg-[#FFF8E1] border-b border-[#FFE082] px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <p className="text-[13px] text-[#F57F17]">
            ⚠️ 본 약관은 초안 버전입니다. 정식 서비스 출시 전 법률 검토 후 최종 확정됩니다.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-10">
        <div className="max-w-2xl mx-auto space-y-8">
          {TERMS.map((term) => (
            <section key={term.num}>
              <h2 className="text-[16px] font-black text-[#1A1A1A] mb-3">
                제 {term.num} 조 ({term.title})
              </h2>
              <p className="text-[14px] text-[#3B3B3B] leading-relaxed whitespace-pre-line">
                {term.body}
              </p>
            </section>
          ))}

          {/* Effective date */}
          <div className="bg-[#F5F5F3] rounded-2xl p-5 border border-[#E5E5E5]">
            <p className="text-[13px] text-[#6B6B6B]">
              공고일: 2026년 4월 7일 | 시행일: 2026년 4월 14일<br />
              FassT 운영팀 · <a href="mailto:privacy@fasst.io" className="text-[#378ADD] hover:underline">privacy@fasst.io</a>
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-4 text-[13px]">
            <Link href="/privacy" className="text-[#378ADD] hover:underline">개인정보처리방침 →</Link>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  )
}
