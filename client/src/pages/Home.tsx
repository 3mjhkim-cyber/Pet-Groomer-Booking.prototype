import { useState } from "react";
import { Link } from "wouter";
import {
  Scissors,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  CalendarDays,
  BarChart3,
  MessageSquare,
  Link2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

type Tab = "dashboard" | "customers" | "calendar";

function fmt(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

// ─── Dashboard Mockup ───────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-4 text-sm">
      {/* Insight box */}
      <div className="bg-white rounded-lg border border-gray-100 p-4 space-y-2.5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">이번 달 운영 요약</p>
        <div className="flex items-start gap-2">
          <span className="mt-1 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          <span className="text-gray-700 text-sm">이번 달 매출의 35%는 기존 고객에서 발생했습니다</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-1 w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
          <span className="text-gray-700 text-sm">신규 고객 15건 / 재방문 37건</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-1 w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
          <span className="text-red-600 text-sm font-medium">60일 이상 미방문 고객 12명</span>
        </div>
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <p className="text-xs text-gray-400 mb-1">이번 달 매출</p>
          <p className="font-bold text-gray-900 text-base leading-tight">6,100,000원</p>
          <p className="text-xs text-green-600 font-medium mt-0.5">▲ 전월 대비 +14%</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <p className="text-xs text-gray-400 mb-1">평균 단가</p>
          <p className="font-bold text-gray-900 text-base">90,000원</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <p className="text-xs text-gray-400 mb-1">예약 건수</p>
          <p className="font-bold text-gray-900 text-base">52건</p>
        </div>
      </div>
    </div>
  );
}

// ─── Customers Mockup ───────────────────────────────────────────────────────
function CustomersMockup() {
  const customers = [
    {
      name: "최미연",
      badge: "VIP",
      badgeColor: "bg-purple-100 text-purple-700",
      pet: "뭉뭉이",
      date: "6월 18일",
      amount: "1,200,000원",
      visits: "8회 방문",
      overdue: null,
    },
    {
      name: "김민수",
      badge: null,
      badgeColor: "",
      pet: "초코",
      date: "2월 17일",
      amount: "450,000원",
      visits: null,
      overdue: "42일 경과",
    },
    {
      name: "김미나",
      badge: "58일 미방문",
      badgeColor: "bg-red-100 text-red-600",
      pet: "치즈",
      date: "11월 2일",
      amount: "200,000원",
      visits: null,
      overdue: "58일 경과",
    },
    {
      name: "박준형",
      badge: "69일 미방문",
      badgeColor: "bg-red-100 text-red-600",
      pet: "똘이",
      date: "9월 21일",
      amount: "520,000원",
      visits: null,
      overdue: "69일 경과",
    },
  ];

  return (
    <div className="bg-gray-50 rounded-xl p-4 text-sm">
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-4 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-400 font-medium">
          <span>고객</span>
          <span>최근 방문</span>
          <span>누적 금액</span>
          <span>상태</span>
        </div>
        {customers.map((c, i) => (
          <div
            key={i}
            className="grid grid-cols-4 px-4 py-3 border-b border-gray-50 last:border-0 items-center"
          >
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-gray-900">{c.name}</span>
                {c.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${c.badgeColor}`}>
                    {c.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{c.pet}</p>
            </div>
            <span className="text-gray-600">{c.date}</span>
            <span className="text-gray-700 font-medium">{c.amount}</span>
            <span>
              {c.visits ? (
                <span className="text-green-600 text-xs font-medium">{c.visits}</span>
              ) : (
                <span className="text-red-500 text-xs font-medium">{c.overdue}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Calendar Mockup ────────────────────────────────────────────────────────
type CalDay = {
  day: number;
  isCurrentMonth: boolean;
  isToday?: boolean;
  events?: { label: string; color: "blue" | "green" }[];
};

const WEEKS: CalDay[][] = [
  [
    { day: 29, isCurrentMonth: false },
    { day: 30, isCurrentMonth: false },
    { day: 31, isCurrentMonth: false, events: [{ label: "오전 10시 이은주", color: "blue" }] },
    { day: 1, isCurrentMonth: true, isToday: true },
    { day: 2, isCurrentMonth: true },
    { day: 3, isCurrentMonth: true, events: [{ label: "오후 2시 김미연", color: "green" }] },
    { day: 4, isCurrentMonth: true },
  ],
  [
    { day: 5, isCurrentMonth: true },
    { day: 6, isCurrentMonth: true },
    { day: 7, isCurrentMonth: true, events: [{ label: "오전 11시 윤미진", color: "blue" }] },
    { day: 8, isCurrentMonth: true, events: [{ label: "오후 3시 김범수", color: "green" }] },
    { day: 9, isCurrentMonth: true },
    { day: 10, isCurrentMonth: true },
    { day: 11, isCurrentMonth: true },
  ],
  [
    { day: 12, isCurrentMonth: true },
    { day: 13, isCurrentMonth: true },
    { day: 14, isCurrentMonth: true },
    { day: 15, isCurrentMonth: true },
    { day: 16, isCurrentMonth: true },
    { day: 17, isCurrentMonth: true },
    { day: 18, isCurrentMonth: true },
  ],
  [
    { day: 19, isCurrentMonth: true },
    { day: 20, isCurrentMonth: true },
    { day: 21, isCurrentMonth: true },
    { day: 22, isCurrentMonth: true },
    { day: 23, isCurrentMonth: true },
    { day: 24, isCurrentMonth: true },
    { day: 25, isCurrentMonth: true },
  ],
  [
    { day: 26, isCurrentMonth: true },
    { day: 27, isCurrentMonth: true },
    { day: 28, isCurrentMonth: true },
    { day: 29, isCurrentMonth: true },
    { day: 30, isCurrentMonth: true },
    { day: 1, isCurrentMonth: false },
    { day: 2, isCurrentMonth: false },
  ],
];

function CalendarMockup() {
  return (
    <div className="bg-gray-50 rounded-xl p-4 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button className="p-1 rounded hover:bg-gray-200 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="font-semibold text-gray-900">2026년 4월</span>
          <button className="p-1 rounded hover:bg-gray-200 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="flex gap-1">
          {["월", "주", "일"].map((v) => (
            <button
              key={v}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                v === "월"
                  ? "bg-primary text-white"
                  : "text-gray-500 hover:bg-gray-200"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 py-1 font-medium">
            {d}
          </div>
        ))}
      </div>
      {/* Calendar grid */}
      <div className="space-y-0.5">
        {WEEKS.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((cell, di) => (
              <div
                key={di}
                className="min-h-[52px] p-1 border border-gray-100 bg-white first:rounded-l last:rounded-r"
              >
                <div className="flex justify-center mb-0.5">
                  <span
                    className={`text-xs w-5 h-5 flex items-center justify-center rounded-full font-medium ${
                      cell.isToday
                        ? "bg-primary text-white"
                        : cell.isCurrentMonth
                        ? "text-gray-800"
                        : "text-gray-300"
                    }`}
                  >
                    {cell.day}
                  </span>
                </div>
                {cell.events?.map((ev, ei) => (
                  <div
                    key={ei}
                    className={`text-[9px] px-1 py-0.5 rounded font-medium truncate leading-tight ${
                      ev.color === "blue"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {ev.label}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [noShowCount, setNoShowCount] = useState(4);
  const [avgPrice, setAvgPrice] = useState(60000);
  const [reminderEffect, setReminderEffect] = useState(70);

  const monthlyLoss = noShowCount * avgPrice;
  const yearlyLoss = monthlyLoss * 12;
  const monthlyRecoverable = Math.round(monthlyLoss * (reminderEffect / 100));
  const yearlyRecoverable = monthlyRecoverable * 12;
  const annualCost = 468000;
  const annualNetProfit = yearlyRecoverable - annualCost;
  const roiMultiplier = Math.round((avgPrice * 2) / 39000);

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "매출 대시보드" },
    { id: "customers", label: "고객 관리" },
    { id: "calendar", label: "예약 캘린더" },
  ];

  const features = [
    {
      icon: <CalendarDays className="w-6 h-6 text-primary" />,
      title: "예약 캘린더",
      desc: "일/주/월 뷰로 한눈에. 예약 링크로 온라인 접수도 받을 수 있어요.",
    },
    {
      icon: <Users className="w-6 h-6 text-primary" />,
      title: "고객 관리",
      desc: "VIP, 미방문 고객을 자동으로 분류. 강아지 정보와 방문 이력을 한곳에.",
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-primary" />,
      title: "매출 대시보드",
      desc: "단순 숫자가 아닌 인사이트. 어떤 고객을 잡아야 하는지 알려드려요.",
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-primary" />,
      title: "카카오 알림톡",
      desc: "예약 확인, 리마인더, 예약금 안내까지 자동 발송.",
    },
    {
      icon: <Scissors className="w-6 h-6 text-primary" />,
      title: "서비스 관리",
      desc: "전체미용, 부분미용, 목욕 등 메뉴별 가격과 소요 시간 설정.",
    },
    {
      icon: <Link2 className="w-6 h-6 text-primary" />,
      title: "예약 링크",
      desc: "네이버 플레이스, 카카오맵 등 어디든 링크만 달면 바로 예약 접수.",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* ── 1. Navigation ──────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" />
            <span className="font-bold text-gray-900 text-lg">정리하개</span>
          </div>
          <Link href="/register">
            <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
              무료로 시작하기
            </button>
          </Link>
        </div>
      </nav>

      {/* ── 2. Hero ────────────────────────────────────────────── */}
      <section className="py-20 md:py-32 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-primary text-xs font-semibold border border-blue-100 mb-6">
            반려동물 미용샵 전용 SaaS
          </span>
          <h1
            className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight"
            style={{ wordBreak: "keep-all" }}
          >
            미용샵 운영, 이제
            <br />
            제대로 정리하세요
          </h1>
          <p className="text-lg text-gray-500 mb-10" style={{ wordBreak: "keep-all" }}>
            예약부터 고객 관리, 매출 분석까지 미용샵에 꼭 필요한 기능만 담았어요
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register">
              <button className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25">
                30일 무료 체험하기
              </button>
            </Link>
            <button
              className="w-full sm:w-auto px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-lg hover:border-gray-300 transition-colors"
              onClick={() =>
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              기능 살펴보기
            </button>
          </div>
          <p className="mt-5 text-sm text-gray-400">신용카드 불필요 · 월 39,000원 · 언제든 해지 가능</p>
        </div>
      </section>

      {/* ── 3. Product Showcase ────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-gray-50 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">이렇게 생겼어요</h2>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100 mb-6 w-fit mx-auto shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Mockup */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden p-6">
            {activeTab === "dashboard" && <DashboardMockup />}
            {activeTab === "customers" && <CustomersMockup />}
            {activeTab === "calendar" && <CalendarMockup />}
          </div>
        </div>
      </section>

      {/* ── 4. No-show Calculator ──────────────────────────────── */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              지금 얼마를 잃고 있는지 확인해보세요
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto" style={{ wordBreak: "keep-all" }}>
              노쇼 한 건은 단순한 빈 시간이 아니에요. 카카오 알림톡 리마인더로 노쇼를 확실히 줄일 수 있어요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Sliders + Kakao preview */}
            <div className="space-y-6">
              {/* Sliders */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-sm">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">월 평균 노쇼 건수</label>
                    <span className="text-sm font-bold text-primary">{noShowCount}건</span>
                  </div>
                  <Slider
                    min={1}
                    max={20}
                    step={1}
                    value={[noShowCount]}
                    onValueChange={([v]) => setNoShowCount(v)}
                  />
                  <div className="flex justify-between mt-1 text-xs text-gray-400">
                    <span>1건</span>
                    <span>20건</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">평균 미용 단가</label>
                    <span className="text-sm font-bold text-primary">{fmt(avgPrice)}</span>
                  </div>
                  <Slider
                    min={30000}
                    max={150000}
                    step={5000}
                    value={[avgPrice]}
                    onValueChange={([v]) => setAvgPrice(v)}
                  />
                  <div className="flex justify-between mt-1 text-xs text-gray-400">
                    <span>30,000원</span>
                    <span>150,000원</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">리마인더 효과 (노쇼 감소율)</label>
                    <span className="text-sm font-bold text-primary">{reminderEffect}%</span>
                  </div>
                  <Slider
                    min={30}
                    max={90}
                    step={5}
                    value={[reminderEffect]}
                    onValueChange={([v]) => setReminderEffect(v)}
                  />
                  <div className="flex justify-between mt-1 text-xs text-gray-400">
                    <span>30%</span>
                    <span>90%</span>
                  </div>
                </div>
              </div>

              {/* Kakao preview */}
              <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
                  자동 발송되는 카카오 알림톡
                </p>
                {/* Message bubble */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold text-yellow-900">
                      정
                    </div>
                    <span className="text-xs font-semibold text-gray-700">정리하개</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {"안녕하세요, 홍길동 보호자님 👋\n내일 오전 10시 초코의 미용 예약이 있어요.\n방문 전 변경이 필요하시면 아래 링크를 눌러주세요."}
                  </p>
                  <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                    예약 하루 전 자동 발송
                  </p>
                </div>
                {/* Steps */}
                <div className="space-y-2.5">
                  {[
                    "예약 확정 시 즉시 확인 알림 발송",
                    "예약 하루 전 리마인더 자동 발송",
                    "예약 시 예약금 안내 정보 즉시 전송",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center flex-shrink-0 font-semibold mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-700">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Result cards */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border-l-4 border-red-400 border border-gray-100 p-5 shadow-sm">
                <p className="text-sm text-gray-500 mb-1">리마인더 없을 때 월 손실</p>
                <p className="text-2xl font-bold text-red-500">{fmt(monthlyLoss)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  노쇼 {noShowCount}건 × 단가 {fmt(avgPrice)}
                </p>
              </div>
              <div className="bg-white rounded-xl border-l-4 border-red-400 border border-gray-100 p-5 shadow-sm">
                <p className="text-sm text-gray-500 mb-1">리마인더 없을 때 연간 손실</p>
                <p className="text-2xl font-bold text-red-500">{fmt(yearlyLoss)}</p>
                <p className="text-xs text-gray-400 mt-1">월 {fmt(monthlyLoss)} × 12개월</p>
              </div>
              <div className="bg-white rounded-xl border-l-4 border-primary border border-gray-100 p-5 shadow-sm">
                <p className="text-sm text-gray-500 mb-1">정리하개 리마인더로 회수 가능한 금액</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-bold text-primary">{fmt(monthlyRecoverable)}</p>
                  <span className="text-sm text-gray-400">/월</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  연간 약 {fmt(yearlyRecoverable)} 회수 가능
                </p>
              </div>
              <div className="bg-white rounded-xl border-l-4 border-primary border border-gray-100 p-5 shadow-sm">
                <p className="text-sm text-gray-500 mb-1">정리하개 연간 비용</p>
                <p className="text-2xl font-bold text-gray-800">{fmt(annualCost)}</p>
                <p className="text-xs text-primary font-medium mt-1">
                  회수 금액이 비용을 훨씬 초과해요
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. ROI Copy ────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 bg-[#EFF6FF]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
              월 39,000원의 가치
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 mb-3">
              구독료보다 훨씬 더 많이 돌아와요
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto" style={{ wordBreak: "keep-all" }}>
              노쇼로 잃는 돈, 관리 못 해서 떠나는 단골 고객. 정리하개 하나로 이 손실을 막을 수 있어요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
              <p className="text-sm text-gray-500 mb-2">월 구독료</p>
              <p className="text-3xl font-bold text-red-500 mb-1">39,000원</p>
              <p className="text-xs text-gray-400">하루 1,300원 / 커피 한 잔보다 저렴해요</p>
            </div>
            {/* Card 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
              <p className="text-sm text-gray-500 mb-2">노쇼 2건만 막아도</p>
              <p className="text-3xl font-bold text-primary mb-1">{fmt(avgPrice * 2)}</p>
              <p className="text-xs text-gray-400">
                구독료의 {roiMultiplier}배 / 바로 본전 이상 뽑아요
              </p>
            </div>
            {/* Card 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
              <p className="text-sm text-gray-500 mb-2">연간 순이익</p>
              <p className={`text-3xl font-bold mb-1 ${annualNetProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
                {annualNetProfit >= 0 ? "+" : ""}{fmt(annualNetProfit)}
              </p>
              <p className="text-xs text-gray-400">회수 금액 - 연간 구독료 / 고스란히 내 수익으로</p>
            </div>
          </div>

          <div className="text-center">
            <Link href="/register">
              <button className="px-8 py-4 bg-primary text-white rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25">
                30일 무료로 시작하기
              </button>
            </Link>
            <p className="mt-3 text-sm text-gray-400">신용카드 불필요 · 언제든 해지 가능</p>
          </div>
        </div>
      </section>

      {/* ── 6. Feature Cards ───────────────────────────────────── */}
      <section id="features" className="py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              미용샵 운영에 필요한 건 다 있어요
            </h2>
            <p className="text-gray-500">복잡한 교육 없이 오늘부터 바로 쓸 수 있어요</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Bottom CTA ──────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 bg-primary">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">지금 바로 시작해보세요</h2>
          <p className="text-white/70 mb-8">30일 동안 모든 기능을 무료로 사용할 수 있어요</p>
          <Link href="/register">
            <button className="px-8 py-4 bg-white text-primary rounded-xl font-semibold text-lg hover:bg-white/90 transition-colors shadow-xl">
              무료로 시작하기
            </button>
          </Link>
          <p className="mt-4 text-white/50 text-sm">30일 무료 체험 후 월 39,000원</p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-gray-900">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/30">
            <div className="flex items-center gap-1.5 text-white/50">
              <Scissors className="w-3.5 h-3.5" />
              <span className="font-semibold">정리하개</span>
            </div>
            <span className="text-white/10">·</span>
            <a href="/terms" className="hover:text-white/60 transition-colors">이용약관</a>
            <a href="/privacy" className="hover:text-white/60 transition-colors">개인정보처리방침</a>
            <a href="/refund" className="hover:text-white/60 transition-colors">환불정책</a>
            <a href="/support" className="hover:text-white/60 transition-colors">고객센터</a>
            <span className="sm:ml-auto">support@jeongrihagae.com · 평일 10–18시</span>
          </div>
          <div className="text-[11px] text-white/20 flex flex-wrap gap-x-4 gap-y-1">
            <span>상호: 정리하개</span>
            <span>대표자: 김제훈</span>
            <span>사업자등록번호: 855-17-02648</span>
            <span>주소: 서울시 송파구 오금로 35길 17</span>
            <span>연락처: 010-5292-4773</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
