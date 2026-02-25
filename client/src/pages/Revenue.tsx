import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, addMonths, subWeeks, addWeeks, subDays, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type Period = "today" | "week" | "month";

interface RevenueStats {
  totalRevenue: number;
  bookingCount: number;
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
      start = startOfDay(ref);
      end = endOfDay(ref);
      break;
    case "week":
      start = startOfWeek(ref, { weekStartsOn: 1 });
      end = endOfWeek(ref, { weekStartsOn: 1 });
      break;
    case "month":
      start = startOfMonth(ref);
      end = endOfMonth(ref);
      break;
  }

  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
}

function getPrevDateRange(period: Period, ref: Date): { startDate: string; endDate: string } {
  let prevRef: Date;
  switch (period) {
    case "today":
      prevRef = subDays(ref, 1);
      break;
    case "week":
      prevRef = subWeeks(ref, 1);
      break;
    case "month":
      prevRef = subMonths(ref, 1);
      break;
  }
  return getDateRange(period, prevRef);
}

function navigateDate(period: Period, ref: Date, direction: -1 | 1): Date {
  switch (period) {
    case "today":
      return direction === -1 ? subDays(ref, 1) : addDays(ref, 1);
    case "week":
      return direction === -1 ? subWeeks(ref, 1) : addWeeks(ref, 1);
    case "month":
      return direction === -1 ? subMonths(ref, 1) : addMonths(ref, 1);
  }
}

function getPeriodLabel(period: Period, ref: Date): string {
  switch (period) {
    case "today":
      return format(ref, "yyyy년 M월 d일 (EEE)", { locale: ko });
    case "week": {
      const s = startOfWeek(ref, { weekStartsOn: 1 });
      const e = endOfWeek(ref, { weekStartsOn: 1 });
      return `${format(s, "M/d")} ~ ${format(e, "M/d")}`;
    }
    case "month":
      return format(ref, "yyyy년 M월", { locale: ko });
  }
}

export default function Revenue() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<Period>("month");
  const [refDate, setRefDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  // 로그인 체크
  if (!user || user.role !== "shop_owner") {
    navigate("/login");
    return null;
  }

  // 구독 상태 확인
  if (user.shop) {
    const shop = user.shop as any;
    const accessible = shop.subscriptionStatus === 'active' ||
      (shop.subscriptionStatus === 'cancelled' && shop.subscriptionEnd && new Date(shop.subscriptionEnd) > new Date());
    if (!accessible) { navigate("/admin/subscription"); return null; }
  }

  const { startDate, endDate } = getDateRange(period, refDate);
  const { startDate: prevStartDate, endDate: prevEndDate } = getPrevDateRange(period, refDate);

  const handlePeriodChange = (v: string) => {
    setPeriod(v as Period);
    setRefDate(new Date());
  };

  // 현재 기간 매출 조회
  const { data: stats, isLoading } = useQuery<RevenueStats>({
    queryKey: ["/api/revenue/stats", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/revenue/stats?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch revenue stats");
      return res.json();
    },
  });

  // 이전 기간 매출 조회 (비교용)
  const { data: prevStats } = useQuery<RevenueStats>({
    queryKey: ["/api/revenue/stats", prevStartDate, prevEndDate],
    queryFn: async () => {
      const res = await fetch(`/api/revenue/stats?startDate=${prevStartDate}&endDate=${prevEndDate}`);
      if (!res.ok) throw new Error("Failed to fetch previous revenue stats");
      return res.json();
    },
  });

  // 증감률 계산
  const growthRate = useMemo(() => {
    if (!stats || !prevStats || prevStats.totalRevenue === 0) return null;
    return ((stats.totalRevenue - prevStats.totalRevenue) / prevStats.totalRevenue) * 100;
  }, [stats, prevStats]);

  // 시간대별 차트 데이터 변환
  const hourlyData = useMemo(() => {
    if (!stats) return [];
    // 9시부터 18시까지 모든 시간대 표시
    const hours = [];
    for (let h = 9; h <= 18; h++) {
      const found = stats.byHour.find((d) => d.hour === h);
      hours.push({
        hour: `${h}시`,
        revenue: found?.revenue || 0,
        count: found?.count || 0,
      });
    }
    return hours;
  }, [stats]);

  // 요일별 차트 데이터 변환
  const weekdayData = useMemo(() => {
    if (!stats) return [];
    return DAY_NAMES.map((name, idx) => {
      const found = stats.byDayOfWeek.find((d) => d.dayOfWeek === idx);
      return {
        day: name,
        revenue: found?.revenue || 0,
        count: found?.count || 0,
      };
    });
  }, [stats]);

  // 서비스별 데이터
  const serviceData = useMemo(() => {
    if (!stats) return [];
    return stats.byService.map((s) => ({
      name: s.serviceName,
      value: s.revenue,
      count: s.count,
    }));
  }, [stats]);

  const periodLabel = {
    today: getPeriodLabel("today", refDate),
    week: getPeriodLabel("week", refDate),
    month: getPeriodLabel("month", refDate),
  };

  const prevPeriodLabel = {
    today: "전일",
    week: "전주",
    month: "전월",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pb-20">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">매출 대시보드</h1>
            <p className="text-muted-foreground mt-1">매출 현황을 한눈에 확인하세요</p>
          </div>

          <Tabs value={period} onValueChange={handlePeriodChange}>
            <TabsList>
              <TabsTrigger value="today">일별</TabsTrigger>
              <TabsTrigger value="week">주별</TabsTrigger>
              <TabsTrigger value="month">월별</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center justify-center gap-3 py-2 bg-white rounded-xl border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRefDate(navigateDate(period, refDate, -1))}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="text-lg font-semibold min-w-[180px] text-center hover:bg-secondary/50 rounded-lg px-3 py-1 transition-colors cursor-pointer">
                {getPeriodLabel(period, refDate)}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={refDate}
                onSelect={(date) => {
                  if (date) {
                    setRefDate(date);
                    setCalendarOpen(false);
                  }
                }}
                defaultMonth={refDate}
                locale={ko}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRefDate(navigateDate(period, refDate, 1))}
            disabled={format(refDate, 'yyyy-MM-dd') >= format(new Date(), 'yyyy-MM-dd')}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefDate(new Date())}
            className="ml-2"
          >
            오늘
          </Button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* 총 매출 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {periodLabel[period]} 매출
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.totalRevenue || 0).toLocaleString()}원
            </div>
            {growthRate !== null && (
              <div className={`flex items-center text-sm mt-1 ${growthRate >= 0 ? "text-green-600" : "text-red-600"}`}>
                {growthRate >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {prevPeriodLabel[period]} 대비 {Math.abs(growthRate).toFixed(1)}%
                {growthRate >= 0 ? " 증가" : " 감소"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 예약 건수 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              예약 건수
            </CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.bookingCount || 0}건</div>
            {prevStats && (
              <div className="text-sm text-muted-foreground mt-1">
                {prevPeriodLabel[period]}: {prevStats.bookingCount}건
              </div>
            )}
          </CardContent>
        </Card>

        {/* 평균 객단가 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              평균 객단가
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats && stats.bookingCount > 0
                ? Math.round(stats.totalRevenue / stats.bookingCount).toLocaleString()
                : 0}
              원
            </div>
            {prevStats && prevStats.bookingCount > 0 && (
              <div className="text-sm text-muted-foreground mt-1">
                {prevPeriodLabel[period]}:{" "}
                {Math.round(prevStats.totalRevenue / prevStats.bookingCount).toLocaleString()}원
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 시간대별 매출 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">시간대별 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString()}원`, "매출"]}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 요일별 매출 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">요일별 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString()}원`, "매출"]}
                  />
                  <Bar dataKey="revenue" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 서비스별 매출 비중 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">서비스별 매출 비중</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {serviceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {serviceData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value.toLocaleString()}원`,
                        name,
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  데이터가 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 일별 매출 추이 */}
        {(period === "month" || period === "week") && stats && stats.byDate.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">일별 매출 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={stats.byDate.map((d) => ({
                      date: format(new Date(d.date), "M/d"),
                      revenue: d.revenue,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis
                      fontSize={12}
                      tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString()}원`, "매출"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: "#8b5cf6", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 서비스별 상세 테이블 */}
      {stats && stats.byService.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">서비스별 상세</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">서비스</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">건수</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">매출</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">비중</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byService.map((service, idx) => (
                    <tr key={service.serviceName} className="border-b last:border-0">
                      <td className="py-3 px-4 flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        {service.serviceName}
                      </td>
                      <td className="text-right py-3 px-4">{service.count}건</td>
                      <td className="text-right py-3 px-4 font-medium">
                        {service.revenue.toLocaleString()}원
                      </td>
                      <td className="text-right py-3 px-4 text-muted-foreground">
                        {((service.revenue / stats.totalRevenue) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-medium">
                    <td className="py-3 px-4">합계</td>
                    <td className="text-right py-3 px-4">{stats.bookingCount}건</td>
                    <td className="text-right py-3 px-4">{stats.totalRevenue.toLocaleString()}원</td>
                    <td className="text-right py-3 px-4">100%</td>
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
