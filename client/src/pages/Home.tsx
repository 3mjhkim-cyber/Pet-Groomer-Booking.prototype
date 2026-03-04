import { Link } from "wouter";
import { Scissors, Calendar, BarChart3, Users, Clock, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-24 md:pt-24 md:pb-40 px-4 overflow-hidden">
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
            className="flex flex-col items-center"
          >
            {/* 배지 */}
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold text-[11px] tracking-[0.14em] uppercase mb-5 md:mb-6 border border-primary/15">
              반려동물 미용샵 토탈 솔루션
            </span>

            {/* 브랜드명 — 주인공 */}
            <div className="flex items-center justify-center gap-2.5 md:gap-3 mb-6 md:mb-8">
              <div className="bg-primary p-2 md:p-2.5 rounded-xl md:rounded-2xl shadow-lg shadow-primary/30 flex-shrink-0">
                <Scissors className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <span
                className="text-4xl sm:text-5xl md:text-7xl font-black text-primary"
                style={{ letterSpacing: "-0.035em" }}
              >
                정리하개
              </span>
            </div>

            {/* 핵심 문구 */}
            <h1
              className="text-[1.85rem] sm:text-4xl md:text-[3.25rem] font-bold text-foreground mb-6 md:mb-8"
              style={{ lineHeight: 1.35, wordBreak: "keep-all" }}
            >
              일은 줄이고
              <br />
              <span className="text-primary relative inline-block">
                매출은 늘리세요
                <svg
                  className="absolute -bottom-1.5 left-0 w-full h-2.5 md:h-3 text-primary/30"
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                >
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                </svg>
              </span>
            </h1>

            {/* 서브타이틀 */}
            <p
              className="text-base md:text-lg text-muted-foreground mb-9 md:mb-11 max-w-md mx-auto"
              style={{ lineHeight: 1.9, wordBreak: "keep-all" }}
            >
              예약 접수부터 승인, 예약금 관리, 고객 관리까지
              <br className="hidden sm:block" />
              {" "}미용샵 운영에 필요한 모든 기능을 하나로
            </p>

            {/* CTA 버튼 */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center w-full sm:w-auto">
              <Link href="/book/gangnam" className="w-full sm:w-auto">
                <button
                  className="w-full sm:w-auto px-7 py-3.5 md:px-8 md:py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl text-base md:text-lg font-bold shadow-xl shadow-primary/25 hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-2"
                  data-testid="button-book-now"
                >
                  <Calendar className="w-5 h-5" />
                  예약 페이지 체험
                </button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <button
                  className="w-full sm:w-auto px-7 py-3.5 md:px-8 md:py-4 bg-white hover:bg-gray-50 text-foreground rounded-2xl text-base md:text-lg font-bold shadow-lg shadow-black/5 border border-border/50 hover:-translate-y-1 transition-all duration-200"
                  data-testid="button-admin-login"
                >
                  관리자 로그인
                </button>
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="absolute top-1/2 left-10 w-72 h-72 bg-primary/8 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute top-20 right-10 w-80 h-80 bg-blue-400/8 rounded-full blur-3xl -z-10 animate-pulse delay-700" />
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section className="py-14 md:py-24 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 md:mb-4">왜 정리하개인가요?</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              미용샵 사장님들의 업무 효율을 극대화합니다
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: <Calendar className="w-6 h-6 md:w-8 md:h-8 text-primary" />,
                title: "스마트 예약 관리",
                desc: "온라인 예약 접수, 승인/거절, 수동 예약 추가까지 한 곳에서",
              },
              {
                icon: <Clock className="w-6 h-6 md:w-8 md:h-8 text-primary" />,
                title: "예약금 자동화",
                desc: "2시간 타이머로 예약금 요청 및 자동 취소 처리",
              },
              {
                icon: <Users className="w-6 h-6 md:w-8 md:h-8 text-primary" />,
                title: "고객 관리",
                desc: "방문 횟수 추적, 단골 고객 파악으로 맞춤 서비스",
              },
              {
                icon: <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-primary" />,
                title: "캘린더 뷰",
                desc: "월간/주간/일간 뷰로 한눈에 보는 예약 현황",
              },
              {
                icon: <Scissors className="w-6 h-6 md:w-8 md:h-8 text-primary" />,
                title: "서비스 관리",
                desc: "전체미용, 부분미용, 목욕 등 서비스별 가격/시간 설정",
              },
              {
                icon: <Shield className="w-6 h-6 md:w-8 md:h-8 text-primary" />,
                title: "안전한 운영",
                desc: "노쇼 방지를 위한 예약금 시스템으로 매출 보호",
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -4 }}
                className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl border border-border/50 shadow-md shadow-black/5 hover:shadow-xl transition-all"
              >
                <div className="w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center mb-4 md:mb-6">
                  {item.icon}
                </div>
                <h3 className="text-base md:text-xl font-bold mb-1.5 md:mb-2">{item.title}</h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <section className="py-12 md:py-20 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 md:mb-12">
            정리하개와 함께하는 미용샵
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-8">
            {[
              { num: "1,200+", label: "가입 미용샵" },
              { num: "45,000+", label: "월간 예약 처리" },
              { num: "98%", label: "노쇼율 감소" },
              { num: "30%", label: "업무 시간 절감" },
            ].map((stat, i) => (
              <div key={i} className="p-4 md:p-6">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1 md:mb-2">
                  {stat.num}
                </div>
                <div className="text-xs md:text-sm text-foreground/70 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="py-14 md:py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-sm md:text-base text-white/70 mb-7 md:mb-8">
            30일 무료체험, 카드 등록 없이 바로 시작할 수 있어요
          </p>
          <Link href="/register">
            <button className="px-8 py-3.5 md:py-4 bg-white text-primary rounded-2xl text-base md:text-lg font-bold shadow-xl hover:-translate-y-1 transition-all duration-200">
              우리 가게 등록하기
            </button>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="bg-foreground text-white/60 text-sm">
        <div className="container mx-auto px-6 py-10 md:py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-10 md:mb-12">

            {/* 브랜드 */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary p-1.5 rounded-lg">
                  <Scissors className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold text-base">정리하개</span>
              </div>
              <p className="text-xs leading-relaxed">
                반려동물 미용샵 사장님을 위한<br />
                예약·고객·매출 관리 플랫폼
              </p>
            </div>

            {/* 서비스 */}
            <div>
              <p className="text-white font-semibold text-xs tracking-wider uppercase mb-3">서비스</p>
              <ul className="space-y-2 text-xs">
                <li><a href="/register" className="hover:text-white transition-colors">가게 등록</a></li>
                <li><a href="/book/gangnam" className="hover:text-white transition-colors">예약 체험</a></li>
                <li><a href="/admin/dashboard" className="hover:text-white transition-colors">관리자 로그인</a></li>
                <li><span className="opacity-50 cursor-default">요금 안내</span></li>
              </ul>
            </div>

            {/* 회사 */}
            <div>
              <p className="text-white font-semibold text-xs tracking-wider uppercase mb-3">회사</p>
              <ul className="space-y-2 text-xs">
                <li><span className="opacity-50 cursor-default">서비스 소개</span></li>
                <li><span className="opacity-50 cursor-default">이용약관</span></li>
                <li><span className="opacity-50 cursor-default">개인정보처리방침</span></li>
                <li><span className="opacity-50 cursor-default">고객센터</span></li>
              </ul>
            </div>

            {/* 고객지원 */}
            <div>
              <p className="text-white font-semibold text-xs tracking-wider uppercase mb-3">고객지원</p>
              <ul className="space-y-2 text-xs">
                <li className="text-white/80">운영시간 평일 10:00–18:00</li>
                <li className="text-white/80">주말·공휴일 휴무</li>
                <li className="mt-3">
                  <span className="text-white/50">이메일</span>
                  <br />
                  <span className="text-white/80">help@jeongrihagae.com</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 하단 구분선 + 카피라이트 */}
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <p className="text-white/40">© 2025 정리하개. All rights reserved.</p>
            <div className="flex items-center gap-4 text-white/40">
              <span className="opacity-50 cursor-default hover:text-white/60 transition-colors">이용약관</span>
              <span className="opacity-50 cursor-default hover:text-white/60 transition-colors">개인정보처리방침</span>
              <span className="opacity-50 cursor-default hover:text-white/60 transition-colors">사업자정보확인</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
