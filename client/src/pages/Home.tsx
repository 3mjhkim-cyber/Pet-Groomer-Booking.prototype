import { Link } from "wouter";
import { Scissors, Calendar, BarChart3, Users, Clock, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 overflow-hidden">
        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm mb-6 border border-primary/20">
              반려동물 미용샵을 위한 토탈 솔루션
            </span>
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              정리하개<br/>
              <span className="text-primary relative inline-block">
                예약 관리
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                </svg>
              </span>
              의 새로운 기준
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              예약 접수부터 승인, 예약금 관리, 고객 관리까지<br/>
              미용샵 운영에 필요한 모든 기능을 하나로
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
              <Link href="/book/gangnam">
                <button className="px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl text-lg font-bold shadow-xl shadow-primary/25 hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-2" data-testid="button-book-now">
                  <Calendar className="w-5 h-5" />
                  예약 페이지 체험
                </button>
              </Link>
              <Link href="/login">
                <button className="px-8 py-4 bg-white hover:bg-gray-50 text-foreground rounded-2xl text-lg font-bold shadow-lg shadow-black/5 border border-border/50 hover:-translate-y-1 transition-all duration-200" data-testid="button-admin-login">
                  관리자 로그인
                </button>
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="absolute top-1/2 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl -z-10 animate-pulse delay-700" />
      </section>

      {/* Features */}
      <section className="py-24 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">왜 정리하개인가요?</h2>
            <p className="text-muted-foreground">미용샵 사장님들의 업무 효율을 극대화합니다</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: <Calendar className="w-8 h-8 text-primary" />,
                title: "스마트 예약 관리",
                desc: "온라인 예약 접수, 승인/거절, 수동 예약 추가까지 한 곳에서"
              },
              {
                icon: <Clock className="w-8 h-8 text-primary" />,
                title: "예약금 자동화",
                desc: "2시간 타이머로 예약금 요청 및 자동 취소 처리"
              },
              {
                icon: <Users className="w-8 h-8 text-primary" />,
                title: "고객 관리",
                desc: "방문 횟수 추적, 단골 고객 파악으로 맞춤 서비스"
              },
              {
                icon: <BarChart3 className="w-8 h-8 text-primary" />,
                title: "캘린더 뷰",
                desc: "월간/주간/일간 뷰로 한눈에 보는 예약 현황"
              },
              {
                icon: <Scissors className="w-8 h-8 text-primary" />,
                title: "서비스 관리",
                desc: "전체미용, 부분미용, 목욕 등 서비스별 가격/시간 설정"
              },
              {
                icon: <Shield className="w-8 h-8 text-primary" />,
                title: "안전한 운영",
                desc: "노쇼 방지를 위한 예약금 시스템으로 매출 보호"
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-3xl border border-border/50 shadow-lg shadow-black/5 hover:shadow-xl transition-all"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-12">정리하개와 함께하는 미용샵</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { num: "1,200+", label: "가입 미용샵" },
              { num: "45,000+", label: "월간 예약 처리" },
              { num: "98%", label: "노쇼율 감소" },
              { num: "30%", label: "업무 시간 절감" },
            ].map((stat, i) => (
              <div key={i} className="p-6">
                <div className="text-4xl font-bold text-primary mb-2 font-display">{stat.num}</div>
                <div className="text-foreground/70 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">지금 바로 시작하세요</h2>
          <p className="text-muted-foreground mb-8">테스트 계정으로 모든 기능을 체험해보세요</p>
          <div className="bg-white p-6 rounded-2xl border border-border inline-block">
            <p className="text-sm text-muted-foreground mb-2">테스트 계정</p>
            <p className="font-mono text-lg">test@test.com / 1234</p>
          </div>
        </div>
      </section>
    </div>
  );
}
