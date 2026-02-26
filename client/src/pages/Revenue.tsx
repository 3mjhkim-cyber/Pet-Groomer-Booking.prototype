import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useCustomersWithRevenue } from "@/hooks/use-shop";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, RefreshCw, UserPlus, BarChart2, FileText,
} from "lucide-react";
import {
  format, startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, subMonths, addMonths, subWeeks, addWeeks,
  subDays, addDays, differenceInDays,
} from "date-fns";
import { ko } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// ─────────────────────────────────────────────
// [헬퍼] NaN / undefined 방지용 안전 숫자 변환
// 사용처: 모든 API 응답 숫자를 UI에 표시하기 전
// ─────────────────────────────────────────────
function safeNum(x: unknown): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

// 비율 계산 (분모 0 → 0 반환, 결과는 정수 %)
function safePct(numerator: unknown, denominator: unknown): number {
  const n = safeNum(numerator);
  const d = safeNum(denominator);
  if (d === 0) return 0;
  return Math.round((n / d) * 100);
}

type Period = "today" | "week" | "month";

interface RevenueStats {
  totalRevenue: number;
  bookingCount: number;
  newVisitCount: number;
  returningVisitCount: number;
  newRevenue: number;
  returningRevenue: number;
  byService: { serviceName: string; revenue: number; count: number }[];
  byDate: { date: string; revenue: number; count: number }[];
  byHour: { hour: number; revenue: number; count: number }[];
  byDayOfWeek: { dayOfWeek: number; revenue: number; count: number }[];
}

const COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#22c55e", "#ec4899"];
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function getDateRange(period: Period, ref: Date): { startDate: string; endDate: string } {
  let start: Date, end: Date;
  switch (period) {
    case "today":
      start = startOfDay(ref); end = endOfDay(ref); break;
    case "week":
      start = startOfWeek(ref, { weekStartsOn: 1 });
      end   = endOfWeek(ref,   { weekStartsOn: 1 }); break;
    case "month":
      start = startOfMonth(ref); end = endOfMonth(ref); break;
  }
  return { startDate: format(start, "yyyy-MM-dd"), endDate: format(end, "yyyy-MM-dd") };
}

function getPrevDateRange(period: Period, ref: Date) {
  let prevRef: Date;
  switch (period) {
    case "today": prevRef = subDays(ref,    1); break;
    case "week":  prevRef = subWeeks(ref,   1); break;
    case "month": prevRef = subMonths(ref,  1); break;
  }
  return getDateRange(period, prevRef);
}

function navigateDate(period: Period, ref: Date, direction: -1 | 1): Date {
  switch (period) {
    case "today": return direction === -1 ? subDays(ref,   1) : addDays(ref,    1);
    case "week":  return direction === -1 ? subWeeks(ref,  1) : addWeeks(ref,   1);
    case "month": return direction === -1 ? subMonths(ref, 1) : addMonths(ref,  1);
  }
}

function getPeriodLabel(period: Period, ref: Date): string {
  switch (period) {
    case "today": return format(ref, "yyyy년 M월 d일 (EEE)", { locale: ko });
    case "week": {
      const s = startOfWeek(ref, { weekStartsOn: 1 });
      const e = endOfWeek(ref,   { weekStartsOn: 1 });
      return `${format(s, "M/d")} ~ ${format(e, "M/d")}`;
    }
    case "month": return format(ref, "yyyy년 M월", { locale: ko });
  }
}

const SUMMARY_TITLE: Record<Period, string> = {
  today: "오늘 운영 요약",
  week:  "이번 주 운영 요약",
  month: "이번 달 운영 요약",
};

const PREV_LABEL: Record<Period, string> = {
  today: "전일",
  week:  "전주",
  month: "전월",
};

export default function Revenue() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [period, setPeriod]       = useState<Period>("month");
  const [refDate, setRefDate]     = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  if (!user || user.role !== "shop_owner") { navigate("/login"); return null; }
  if (user.shop) {
    const shop = user.shop as any;
    const ok = shop.subscriptionStatus === "active" ||
      (shop.subscriptionStatus === "cancelled" && shop.subscriptionEnd &&
       new Date(shop.subscriptionEnd) > new Date());
    if (!ok) { navigate("/admin/subscription"); return null; }
  }

  const { startDate, endDate }                     = getDateRange(period, refDate);
  const { startDate: prevStart, endDate: prevEnd } = getPrevDateRange(period, refDate);

  // ─── 소스1: /revenue/stats — KPI + 신규/재방문 ───────────────────────────
  const { data: stats, isLoading: isStatsLoading } = useQuery<RevenueStats>({
    queryKey: ["/api/revenue/stats", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/revenue/stats?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch revenue stats");
      return res.json();
    },
  });

  const { data: prevStats, isLoading: isPrevStatsLoading } = useQuery<RevenueStats>({
    queryKey: ["/api/revenue/stats", prevStart, prevEnd],
    queryFn: async () => {
      const res = await fetch(`/api/revenue/stats?startDate=${prevStart}&endDate=${prevEnd}`);
      if (!res.ok) throw new Error("Failed to fetch previous revenue stats");
      return res.json();
    },
  });

  // ─── 소스2: /customers/with-revenue — 60일 미방문 인원 수 ────────────────
  const { data: allCustomers, isLoading: isCustomersLoading } = useCustomersWithRevenue();

  // ─────────────────────────────────────────────────────────────────────────
  // [A] 소스1 기반 지표 계산 (신규/재방문/재방문율/매출 비중)
  //     safeNum으로 모두 정규화 → NaN 불가
  // ─────────────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const totalCount       = safeNum(stats?.bookingCount);
    const newCount         = safeNum(stats?.newVisitCount);
    // returningVisitCount가 있으면 우선 사용, 없으면 totalCount - newCount
    const revisitCount     = safeNum(stats?.returningVisitCount) || Math.max(0, totalCount - newCount);
    const revisitRate      = safePct(revisitCount, totalCount);       // 분모 0이면 0

    const totalRevenue     = safeNum(stats?.totalRevenue);
    const returningRevenue = safeNum(stats?.returningRevenue);
    const revisitRevenueRate = safePct(returningRevenue, totalRevenue); // 분모 0이면 0

    const avgOrderValue    = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;

    // 전 기간 비교
    const prevRevenue      = safeNum(prevStats?.totalRevenue);
    const prevCount        = safeNum(prevStats?.bookingCount);
    const prevAvg          = prevCount > 0 ? Math.round(prevRevenue / prevCount) : 0;
    const growthRate: number | null =
      prevRevenue > 0
        ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
        : null;

    return {
      totalCount, newCount, revisitCount, revisitRate,
      totalRevenue, returningRevenue, revisitRevenueRate,
      avgOrderValue,
      prevRevenue, prevCount, prevAvg, growthRate,
    };
  }, [stats, prevStats]);

  // ─────────────────────────────────────────────────────────────────────────
  // [B] 소스2 기반 지표 계산 (60일 이상 미방문 고객 수)
  //     lastVisit, firstVisitDate 둘 다 0시 기준으로 diff 계산
  // ─────────────────────────────────────────────────────────────────────────
  const atRiskCount = useMemo(() => {
    if (!allCustomers) return 0;
    const today = startOfDay(new Date());
    return allCustomers.filter(c => {
      // lastVisit 우선, 없으면 firstVisitDate로 대체
      const rawDate = c.lastVisit ?? c.firstVisitDate;
      if (!rawDate) return false;
      const diff = differenceInDays(today, startOfDay(new Date(rawDate)));
      return diff >= 60;
    }).length;
  }, [allCustomers]);

  // ─── 차트 데이터 변환 ────────────────────────────────────────────────────
  const hourlyData = useMemo(() => {
    if (!stats) return [];
    return Array.from({ length: 10 }, (_, i) => {
      const h = 9 + i;
      const found = stats.byHour.find(d => d.hour === h);
      return { hour: `${h}시`, revenue: safeNum(found?.revenue), count: safeNum(found?.count) };
    });
  }, [stats]);

  const weekdayData = useMemo(() => {
    if (!stats) return [];
    return DAY_NAMES.map((name, idx) => {
      const found = stats.byDayOfWeek.find(d => d.dayOfWeek === idx);
      return { day: name, revenue: safeNum(found?.revenue), count: safeNum(found?.count) };
    });
  }, [stats]);

  const serviceData = useMemo(() => {
    if (!stats) return [];
    return stats.byService.map(s => ({
      name: s.serviceName,
      value: safeNum(s.revenue),
      count: safeNum(s.count),
    }));
  }, [stats]);

  // ─── 로딩: 소스1(stats)만 풀스크린 로딩 처리. 소스2(customers)는 0으로 폴백 ─
  if (isStatsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // ─── 운영 요약 문장 결정 ──────────────────────────────────────────────────
  // 기간 내 예약/방문 건수가 0이면 "데이터 없음" 한 줄만 표시
  const hasData = kpi.totalCount > 0;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl pb-20 space-y-6">

      {/* ── 헤더 ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">매출 대시보드</h1>
          <p className="text-sm text-muted-foreground mt-0.5">매출 현황과 고객 흐름을 한눈에 확인하세요</p>
        </div>
        <Tabs value={period} onValueChange={v => { setPeriod(v as Period); setRefDate(new Date()); }}>
          <TabsList>
            <TabsTrigger value="today">일별</TabsTrigger>
            <TabsTrigger value="week">주별</TabsTrigger>
            <TabsTrigger value="month">월별</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── 날짜 내비게이터 ── */}
      <div className="flex items-center justify-center gap-3 py-2.5 bg-white rounded-xl border shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => setRefDate(navigateDate(period, refDate, -1))}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button className="text-base font-semibold min-w-[180px] text-center hover:bg-secondary/50 rounded-lg px-3 py-1 transition-colors">
              {getPeriodLabel(period, refDate)}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={refDate}
              onSelect={date => { if (date) { setRefDate(date); setCalendarOpen(false); } }}
              defaultMonth={refDate}
              locale={ko}
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost" size="icon"
          onClick={() => setRefDate(navigateDate(period, refDate, 1))}
          disabled={format(refDate, "yyyy-MM-dd") >= format(new Date(), "yyyy-MM-dd")}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setRefDate(new Date())} className="ml-1">
          오늘
        </Button>
      </div>

      {/* ── 운영 요약 카드 ──────────────────────────────────────────────────
           소스1(totalCount/newCount/revisitCount/revisitRevenueRate) +
           소스2(atRiskCount) 조합
           totalCount === 0이면 단일 안내 문장만 표시
      ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">{SUMMARY_TITLE[period]}</span>
        </div>

        {!hasData ? (
          /* 데이터 없음 — 단일 문장 */
          <p className="text-sm text-muted-foreground">선택한 기간에 매출/예약 데이터가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {/* 재방문 매출 비중 — 소스1 */}
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <p className="text-sm leading-relaxed">
                {SUMMARY_TITLE[period].replace(" 운영 요약", "")} 매출의{" "}
                <span className="font-semibold text-primary">{kpi.revisitRevenueRate}%</span>
                는 기존 고객에서 발생했습니다.
              </p>
            </div>

            {/* 신규 / 재방문 건수 — 소스1 */}
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
              <p className="text-sm leading-relaxed">
                신규 고객{" "}
                <span className="font-semibold text-blue-600">{kpi.newCount}건</span>
                {" "}/{" "}재방문{" "}
                <span className="font-semibold text-slate-700">{kpi.revisitCount}건</span>
              </p>
            </div>

            {/* 60일 이상 미방문 — 소스2 */}
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
              <p className="text-sm leading-relaxed">
                60일 이상 미방문 고객{" "}
                <span className="font-semibold text-amber-600">
                  {isCustomersLoading ? "…" : atRiskCount}명
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── KPI 카드 1행: 매출 · 객단가 · 예약건수 ────────────────────────────
           safeNum 적용 → NaN/undefined 출력 불가
      ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 매출 */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
              {getPeriodLabel(period, refDate)} 매출
            </CardTitle>
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-2xl font-bold tracking-tight">
              {kpi.totalRevenue.toLocaleString()}
              <span className="text-base font-normal text-muted-foreground ml-1">원</span>
            </div>
            {kpi.growthRate !== null && (
              <div className={`flex items-center gap-1 text-xs mt-1.5 ${kpi.growthRate >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {kpi.growthRate >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                <span>
                  {PREV_LABEL[period]} 대비 {Math.abs(kpi.growthRate).toFixed(1)}%{" "}
                  {kpi.growthRate >= 0 ? "증가" : "감소"}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 평균 객단가 */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
              평균 객단가
            </CardTitle>
            <div className="w-7 h-7 rounded-md bg-cyan-50 flex items-center justify-center">
              <BarChart2 className="h-3.5 w-3.5 text-cyan-600" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-2xl font-bold tracking-tight">
              {kpi.avgOrderValue.toLocaleString()}
              <span className="text-base font-normal text-muted-foreground ml-1">원</span>
            </div>
            {kpi.prevAvg > 0 && (
              <div className="text-xs text-muted-foreground mt-1.5">
                {PREV_LABEL[period]}: {kpi.prevAvg.toLocaleString()}원
              </div>
            )}
          </CardContent>
        </Card>

        {/* 예약 건수 */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
              예약 건수
            </CardTitle>
            <div className="w-7 h-7 rounded-md bg-violet-50 flex items-center justify-center">
              <CalendarIcon className="h-3.5 w-3.5 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-2xl font-bold tracking-tight">
              {kpi.totalCount}
              <span className="text-base font-normal text-muted-foreground ml-1">건</span>
            </div>
            {!isPrevStatsLoading && (
              <div className="text-xs text-muted-foreground mt-1.5">
                {PREV_LABEL[period]}: {safeNum(prevStats?.bookingCount)}건
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── KPI 카드 2행: 재방문율 · 신규/기존 ───────────────────────────────
           소스1만 사용. 0건이면 0% / 0,0 표시 (NaN 없음)
      ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 재방문율 */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
              재방문율
            </CardTitle>
            <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
              <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-2xl font-bold tracking-tight">
              {kpi.revisitRate}
              <span className="text-base font-normal text-muted-foreground ml-0.5">%</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              재방문 {kpi.revisitCount}건 / 전체 {kpi.totalCount}건
            </div>
          </CardContent>
        </Card>

        {/* 신규 / 재방문 */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
              신규 / 재방문
            </CardTitle>
            <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
              <UserPlus className="h-3.5 w-3.5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex items-end gap-3">
              <div>
                <div className="text-2xl font-bold tracking-tight text-blue-600">
                  {kpi.newCount}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">신규</div>
              </div>
              <div className="text-muted-foreground/40 text-lg font-light mb-1">/</div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-slate-600">
                  {kpi.revisitCount}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">재방문</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 차트 영역 (기존 유지) ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 시간대별 */}
        <Card className="shadow-sm">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold">시간대별 매출</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="hour" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={v => `${(safeNum(v) / 10000).toFixed(0)}만`} />
                  <Tooltip formatter={(v: number) => [`${safeNum(v).toLocaleString()}원`, "매출"]} />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 요일별 */}
        <Card className="shadow-sm">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold">요일별 매출</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={v => `${(safeNum(v) / 10000).toFixed(0)}만`} />
                  <Tooltip formatter={(v: number) => [`${safeNum(v).toLocaleString()}원`, "매출"]} />
                  <Bar dataKey="revenue" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 서비스별 */}
        <Card className="shadow-sm">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold">서비스별 매출 비중</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-[260px]">
              {serviceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceData} cx="50%" cy="50%"
                      innerRadius={55} outerRadius={90}
                      paddingAngle={2} dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(safeNum(percent) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {serviceData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number, name: string) => [`${safeNum(v).toLocaleString()}원`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  데이터가 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 일별 추이 */}
        {(period === "month" || period === "week") && stats && stats.byDate.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-sm font-semibold">일별 매출 추이</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.byDate.map(d => ({
                    date: format(new Date(d.date), "M/d"),
                    revenue: safeNum(d.revenue),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false}
                      tickFormatter={v => `${(safeNum(v) / 10000).toFixed(0)}만`} />
                    <Tooltip formatter={(v: number) => [`${safeNum(v).toLocaleString()}원`, "매출"]} />
                    <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2}
                      dot={{ fill: "#8b5cf6", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── 서비스별 상세 테이블 ─────────────────────────────────────────────
           비중(%) 계산도 safePct 사용 → NaN 없음
      ─────────────────────────────────────────────────────────────────── */}
      {stats && stats.byService.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold">서비스별 상세</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-secondary/30">
                    <th className="text-left  py-2.5 px-5 font-medium text-muted-foreground">서비스</th>
                    <th className="text-right py-2.5 px-5 font-medium text-muted-foreground">건수</th>
                    <th className="text-right py-2.5 px-5 font-medium text-muted-foreground">매출</th>
                    <th className="text-right py-2.5 px-5 font-medium text-muted-foreground">비중</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byService.map((svc, idx) => (
                    <tr key={svc.serviceName} className="border-b last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-5 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        {svc.serviceName}
                      </td>
                      <td className="text-right py-3 px-5 text-muted-foreground">
                        {safeNum(svc.count)}건
                      </td>
                      <td className="text-right py-3 px-5 font-medium">
                        {safeNum(svc.revenue).toLocaleString()}원
                      </td>
                      <td className="text-right py-3 px-5 text-muted-foreground">
                        {/* safePct: totalRevenue가 0이어도 NaN 없음 */}
                        {safePct(svc.revenue, stats.totalRevenue)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-secondary/30 font-semibold">
                    <td className="py-3 px-5">합계</td>
                    <td className="text-right py-3 px-5">{kpi.totalCount}건</td>
                    <td className="text-right py-3 px-5">{kpi.totalRevenue.toLocaleString()}원</td>
                    <td className="text-right py-3 px-5">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
