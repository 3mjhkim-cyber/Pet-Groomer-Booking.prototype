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
  Clock, ChevronLeft, ChevronRight, Users, RefreshCw, UserPlus,
  BarChart2, FileText,
} from "lucide-react";
import {
  format, startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, subMonths, addMonths, subWeeks, addWeeks,
  subDays, addDays, differenceInDays,
} from "date-fns";
import { ko } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

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
  let start: Date;
  let end: Date;
  switch (period) {
    case "today":
      start = startOfDay(ref); end = endOfDay(ref); break;
    case "week":
      start = startOfWeek(ref, { weekStartsOn: 1 });
      end = endOfWeek(ref, { weekStartsOn: 1 }); break;
    case "month":
      start = startOfMonth(ref); end = endOfMonth(ref); break;
  }
  return { startDate: format(start, "yyyy-MM-dd"), endDate: format(end, "yyyy-MM-dd") };
}

function getPrevDateRange(period: Period, ref: Date) {
  let prevRef: Date;
  switch (period) {
    case "today": prevRef = subDays(ref, 1); break;
    case "week":  prevRef = subWeeks(ref, 1); break;
    case "month": prevRef = subMonths(ref, 1); break;
  }
  return getDateRange(period, prevRef);
}

function navigateDate(period: Period, ref: Date, direction: -1 | 1): Date {
  switch (period) {
    case "today": return direction === -1 ? subDays(ref, 1) : addDays(ref, 1);
    case "week":  return direction === -1 ? subWeeks(ref, 1) : addWeeks(ref, 1);
    case "month": return direction === -1 ? subMonths(ref, 1) : addMonths(ref, 1);
  }
}

function getPeriodLabel(period: Period, ref: Date): string {
  switch (period) {
    case "today": return format(ref, "yyyy년 M월 d일 (EEE)", { locale: ko });
    case "week": {
      const s = startOfWeek(ref, { weekStartsOn: 1 });
      const e = endOfWeek(ref, { weekStartsOn: 1 });
      return `${format(s, "M/d")} ~ ${format(e, "M/d")}`;
    }
    case "month": return format(ref, "yyyy년 M월", { locale: ko });
  }
}

const summaryTitle: Record<Period, string> = {
  today: "오늘 운영 요약",
  week: "이번 주 운영 요약",
  month: "이번 달 운영 요약",
};

const prevPeriodLabel: Record<Period, string> = {
  today: "전일",
  week: "전주",
  month: "전월",
};

export default function Revenue() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<Period>("month");
  const [refDate, setRefDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  if (!user || user.role !== "shop_owner") { navigate("/login"); return null; }
  if (user.shop) {
    const shop = user.shop as any;
    const accessible = shop.subscriptionStatus === 'active' ||
      (shop.subscriptionStatus === 'cancelled' && shop.subscriptionEnd && new Date(shop.subscriptionEnd) > new Date());
    if (!accessible) { navigate("/admin/subscription"); return null; }
  }

  const { startDate, endDate } = getDateRange(period, refDate);
  const { startDate: prevStartDate, endDate: prevEndDate } = getPrevDateRange(period, refDate);

  const { data: stats, isLoading } = useQuery<RevenueStats>({
    queryKey: ["/api/revenue/stats", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/revenue/stats?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch revenue stats");
      return res.json();
    },
  });

  const { data: prevStats } = useQuery<RevenueStats>({
    queryKey: ["/api/revenue/stats", prevStartDate, prevEndDate],
    queryFn: async () => {
      const res = await fetch(`/api/revenue/stats?startDate=${prevStartDate}&endDate=${prevEndDate}`);
      if (!res.ok) throw new Error("Failed to fetch previous revenue stats");
      return res.json();
    },
  });

  // 전체 고객 목록 (60일 이상 미방문 계산용)
  const { data: allCustomers } = useCustomersWithRevenue();

  const growthRate = useMemo(() => {
    if (!stats || !prevStats || prevStats.totalRevenue === 0) return null;
    return ((stats.totalRevenue - prevStats.totalRevenue) / prevStats.totalRevenue) * 100;
  }, [stats, prevStats]);

  // 재방문율 (%)
  const returningRate = useMemo(() => {
    if (!stats || stats.bookingCount === 0) return null;
    return Math.round((stats.returningVisitCount / stats.bookingCount) * 100);
  }, [stats]);

  // 재방문 매출 비중 (%)
  const returningRevenueRate = useMemo(() => {
    if (!stats || stats.totalRevenue === 0) return null;
    return Math.round((stats.returningRevenue / stats.totalRevenue) * 100);
  }, [stats]);

  // 60일 이상 미방문 고객 수
  const inactiveCount = useMemo(() => {
    if (!allCustomers) return 0;
    const today = startOfDay(new Date());
    return allCustomers.filter(c => {
      if (!c.lastVisit) return false;
      return differenceInDays(today, startOfDay(new Date(c.lastVisit))) >= 60;
    }).length;
  }, [allCustomers]);

  const hourlyData = useMemo(() => {
    if (!stats) return [];
    const hours = [];
    for (let h = 9; h <= 18; h++) {
      const found = stats.byHour.find(d => d.hour === h);
      hours.push({ hour: `${h}시`, revenue: found?.revenue || 0, count: found?.count || 0 });
    }
    return hours;
  }, [stats]);

  const weekdayData = useMemo(() => {
    if (!stats) return [];
    return DAY_NAMES.map((name, idx) => {
      const found = stats.byDayOfWeek.find(d => d.dayOfWeek === idx);
      return { day: name, revenue: found?.revenue || 0, count: found?.count || 0 };
    });
  }, [stats]);

  const serviceData = useMemo(() => {
    if (!stats) return [];
    return stats.byService.map(s => ({ name: s.serviceName, value: s.revenue, count: s.count }));
  }, [stats]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const avgOrderValue = stats && stats.bookingCount > 0
    ? Math.round(stats.totalRevenue / stats.bookingCount)
    : 0;
  const prevAvgOrderValue = prevStats && prevStats.bookingCount > 0
    ? Math.round(prevStats.totalRevenue / prevStats.bookingCount)
    : 0;

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

      {/* 날짜 내비게이터 */}
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
          disabled={format(refDate, 'yyyy-MM-dd') >= format(new Date(), 'yyyy-MM-dd')}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setRefDate(new Date())} className="ml-1">
          오늘
        </Button>
      </div>

      {/* ── 운영 요약 카드 ── */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">{summaryTitle[period]}</span>
        </div>
        <div className="space-y-3">
          {/* 재방문 매출 비중 */}
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <p className="text-sm text-foreground leading-relaxed">
              {returningRevenueRate !== null ? (
                <>
                  매출의{" "}
                  <span className="font-semibold text-primary">{returningRevenueRate}%</span>
                  가 재방문 고객에서 발생합니다.{" "}
                  <span className="text-muted-foreground text-xs">
                    ({(stats?.returningRevenue || 0).toLocaleString()}원 / {(stats?.totalRevenue || 0).toLocaleString()}원)
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">해당 기간 매출 데이터가 없습니다.</span>
              )}
            </p>
          </div>

          {/* 신규 / 기존 고객 수 */}
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
            <p className="text-sm text-foreground leading-relaxed">
              신규 고객{" "}
              <span className="font-semibold text-blue-600">{stats?.newVisitCount ?? 0}명</span>
              {" "}방문,{" "}기존 고객{" "}
              <span className="font-semibold text-slate-700">{stats?.returningVisitCount ?? 0}명</span>
              {" "}재방문했습니다.
            </p>
          </div>

          {/* 60일 이상 미방문 */}
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
            <p className="text-sm text-foreground leading-relaxed">
              마지막 방문 후 60일 이상 경과한 고객이{" "}
              <span className="font-semibold text-amber-600">{inactiveCount}명</span>
              {" "}있습니다.
              {inactiveCount > 0 && (
                <span className="text-muted-foreground text-xs ml-1">리마인드 연락을 고려해보세요.</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI 카드 — 1행: 매출 · 객단가 · 예약건수 ── */}
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
              {(stats?.totalRevenue || 0).toLocaleString()}
              <span className="text-base font-normal text-muted-foreground ml-1">원</span>
            </div>
            {growthRate !== null && (
              <div className={`flex items-center gap-1 text-xs mt-1.5 ${growthRate >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {growthRate >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                <span>{prevPeriodLabel[period]} 대비 {Math.abs(growthRate).toFixed(1)}% {growthRate >= 0 ? "증가" : "감소"}</span>
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
              {avgOrderValue.toLocaleString()}
              <span className="text-base font-normal text-muted-foreground ml-1">원</span>
            </div>
            {prevAvgOrderValue > 0 && (
              <div className="text-xs text-muted-foreground mt-1.5">
                {prevPeriodLabel[period]}: {prevAvgOrderValue.toLocaleString()}원
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
              {stats?.bookingCount || 0}
              <span className="text-base font-normal text-muted-foreground ml-1">건</span>
            </div>
            {prevStats && (
              <div className="text-xs text-muted-foreground mt-1.5">
                {prevPeriodLabel[period]}: {prevStats.bookingCount}건
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── KPI 카드 — 2행: 재방문율 · 신규/기존 ── */}
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
              {returningRate !== null ? returningRate : '-'}
              <span className="text-base font-normal text-muted-foreground ml-0.5">%</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {stats ? `재방문 ${stats.returningVisitCount}건 / 전체 ${stats.bookingCount}건` : '데이터 없음'}
            </div>
          </CardContent>
        </Card>

        {/* 신규 / 기존 고객 */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
              신규 / 기존 고객
            </CardTitle>
            <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
              <UserPlus className="h-3.5 w-3.5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex items-end gap-3">
              <div>
                <div className="text-2xl font-bold tracking-tight text-blue-600">
                  {stats?.newVisitCount ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">신규</div>
              </div>
              <div className="text-muted-foreground/40 text-lg font-light mb-1">/</div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-slate-600">
                  {stats?.returningVisitCount ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">재방문</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 차트 영역 (기존 유지) ── */}
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
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 10000).toFixed(0)}만`} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString()}원`, "매출"]} />
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
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 10000).toFixed(0)}만`} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString()}원`, "매출"]} />
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
                      data={serviceData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={90}
                      paddingAngle={2} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {serviceData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number, name: string) => [`${v.toLocaleString()}원`, name]} />
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
                  <LineChart data={stats.byDate.map(d => ({ date: format(new Date(d.date), "M/d"), revenue: d.revenue }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 10000).toFixed(0)}만`} />
                    <Tooltip formatter={(v: number) => [`${v.toLocaleString()}원`, "매출"]} />
                    <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: "#8b5cf6", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── 서비스별 상세 테이블 (기존 유지) ── */}
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
                    <th className="text-left py-2.5 px-5 font-medium text-muted-foreground">서비스</th>
                    <th className="text-right py-2.5 px-5 font-medium text-muted-foreground">건수</th>
                    <th className="text-right py-2.5 px-5 font-medium text-muted-foreground">매출</th>
                    <th className="text-right py-2.5 px-5 font-medium text-muted-foreground">비중</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byService.map((svc, idx) => (
                    <tr key={svc.serviceName} className="border-b last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-5 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        {svc.serviceName}
                      </td>
                      <td className="text-right py-3 px-5 text-muted-foreground">{svc.count}건</td>
                      <td className="text-right py-3 px-5 font-medium">{svc.revenue.toLocaleString()}원</td>
                      <td className="text-right py-3 px-5 text-muted-foreground">
                        {((svc.revenue / stats.totalRevenue) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-secondary/30 font-semibold">
                    <td className="py-3 px-5">합계</td>
                    <td className="text-right py-3 px-5">{stats.bookingCount}건</td>
                    <td className="text-right py-3 px-5">{stats.totalRevenue.toLocaleString()}원</td>
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
