import Link from 'next/link'
import type { Metadata } from 'next'
import { AppFooter } from '@/components/common/AppFooter'

export const metadata: Metadata = {
  title: '개인정보처리방침 | FassT',
  description: 'FassT 개인정보처리방침 — 수집 항목, 이용 목적, 보유 기간 및 사용자 권리',
}

const SECTIONS = [
  {
    num: '1',
    title: '수집 항목',
    content: [
      {
        sub: 'Google OAuth 연동 시',
        items: ['이름 (Google 계정 표시명)', '이메일 주소', '프로필 사진 URL'],
      },
      {
        sub: '서비스 이용 중 생성 데이터',
        items: [
          '학습 진도 (완료한 강의·레슨)',
          '테스트 결과 및 점수',
          'XP·레벨·스트릭 (게이미피케이션)',
          '리더보드 순위 데이터',
        ],
      },
      {
        sub: '광고 관련',
        items: ['배너 클릭 횟수 (개인 식별 불가, 집계 수치만)'],
      },
      {
        sub: '자동 수집',
        items: ['IP 주소 (AES-256 암호화 저장, 보안 목적)', '서비스 접속 일시'],
      },
    ],
  },
  {
    num: '2',
    title: '수집 목적',
    content: [
      {
        sub: '',
        items: [
          '서비스 제공 및 학습 관리 (진도 저장, 테스트 결과 분석)',
          '게이미피케이션 운영 (XP 적립, 레벨업, 리더보드)',
          '맞춤형 학습 경로 추천',
          '서비스 개선 및 통계 분석 (개인 식별 불가 형태)',
          '광고 표시 — 무료 플랜 사용자 대상 (유료 전환 시 광고 제거)',
        ],
      },
    ],
  },
  {
    num: '3',
    title: '보유 기간',
    content: [
      {
        sub: '',
        items: [
          '회원 탈퇴 시 즉시 삭제 (30일 이내 완전 삭제)',
          '법령에 따라 보존이 필요한 경우 해당 기간만 별도 보관 후 파기',
          '학습 데이터는 탈퇴 요청 즉시 비식별화 처리',
        ],
      },
    ],
  },
  {
    num: '4',
    title: '제3자 제공',
    content: [
      {
        sub: '서비스 운영을 위한 외부 서비스',
        items: [
          'Supabase (데이터 저장) — 미국 소재, GDPR 적합성 결정 준수',
          'Google OAuth (로그인) — 이메일·프로필만 수신, 게시 권한 없음',
          'Google AdSense (광고) — 무료 플랜 사용자, 클릭 행동 분석',
        ],
      },
      {
        sub: '제공 불가',
        items: ['수사기관 등 법령에 의한 요구 제외 시 제3자 제공 없음'],
      },
    ],
  },
  {
    num: '5',
    title: '사용자 권리',
    content: [
      {
        sub: '행사 가능한 권리',
        items: [
          '개인정보 열람 요청 — 앱 내 설정 > 개인정보 보기',
          '개인정보 수정 요청 — Google 계정 정보 수정 시 자동 반영',
          '개인정보 삭제 요청 (Right to be Forgotten) — 앱 내 탈퇴 또는 아래 이메일',
          '처리 정지 요청',
          '이의 제기 권리',
        ],
      },
      {
        sub: '요청 방법',
        items: ['이메일: privacy@fasst.io', '앱 내: 설정 > 개인정보 > 데이터 삭제 요청'],
      },
    ],
  },
  {
    num: '6',
    title: '보안 조치',
    content: [
      {
        sub: '',
        items: [
          'AES-256-GCM 암호화 — 이메일, IP 주소 암호화 저장',
          'HTTPS (TLS 1.3) 통신 암호화',
          'Row Level Security (RLS) — 본인 데이터만 접근 가능',
          'JWT 기반 인증 (24시간 만료, 7일 갱신)',
          'Rate Limiting — API 분당 60회 제한',
        ],
      },
    ],
  },
]

export default function PrivacyPage() {
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
          <h1 className="text-[28px] font-black mb-2">개인정보처리방침</h1>
          <p className="text-[14px] text-white/60">시행일: 2026년 4월 14일</p>
        </div>
      </div>

      {/* Intro */}
      <div className="bg-[#F5F5F3] border-b border-[#E5E5E5] px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
            FassT(이하 &ldquo;서비스&rdquo;)는 이용자의 개인정보를 중요하게 생각합니다.
            본 방침은 Google OAuth를 통해 수집되는 정보와 서비스 이용 중 생성되는
            학습 데이터의 처리 방법을 설명합니다.
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="px-6 py-10">
        <div className="max-w-2xl mx-auto space-y-10">
          {SECTIONS.map((sec) => (
            <section key={sec.num}>
              <h2 className="text-[18px] font-black text-[#1A1A1A] mb-4">
                {sec.num}. {sec.title}
              </h2>
              <div className="space-y-4">
                {sec.content.map((block, bi) => (
                  <div key={bi}>
                    {block.sub && (
                      <h3 className="text-[13px] font-bold text-[#6B6B6B] mb-2">{block.sub}</h3>
                    )}
                    <ul className="space-y-1.5">
                      {block.items.map((item, ii) => (
                        <li key={ii} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E24B4A] flex-shrink-0 mt-2" />
                          <span className="text-[14px] text-[#1A1A1A] leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* Contact */}
          <section className="bg-[#F5F5F3] rounded-2xl p-6 border border-[#E5E5E5]">
            <h2 className="text-[18px] font-black text-[#1A1A1A] mb-3">개인정보 보호책임자</h2>
            <div className="space-y-1">
              <p className="text-[14px] text-[#1A1A1A] font-medium">FassT 운영팀</p>
              <p className="text-[13px] text-[#6B6B6B]">이메일: <a href="mailto:privacy@fasst.io" className="text-[#378ADD] hover:underline">privacy@fasst.io</a></p>
              <p className="text-[13px] text-[#6B6B6B]">처리 기간: 요청 수신 후 영업일 5일 이내</p>
            </div>
          </section>

          {/* Links */}
          <div className="flex gap-4 text-[13px]">
            <Link href="/terms" className="text-[#378ADD] hover:underline">이용약관 →</Link>
            <Link href="/settings/privacy" className="text-[#378ADD] hover:underline">내 데이터 관리 →</Link>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  )
}
