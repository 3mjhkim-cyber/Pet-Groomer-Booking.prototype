import { useAuth } from "@/hooks/use-auth";
import { useCustomersWithRevenue } from "@/hooks/use-shop";
import { useIsSubscriptionAccessible } from "@/hooks/use-subscription";
import { useLocation } from "wouter";
import {
  Loader2, Users, Search, Award, AlertCircle, RefreshCw,
  ChevronRight, PawPrint, Calendar, MessageCircle,
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { ko } from "date-fns/locale";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CustomerDetailSheet from "@/components/CustomerDetailSheet";
import { useToast } from "@/hooks/use-toast";
import type { Customer } from "@shared/schema";

type CustomerWithRevenue = Customer & { totalRevenue: number };
type EnrichedCustomer = CustomerWithRevenue & {
  isVip: boolean;
  isAtRisk: boolean;
  isReturnSoon: boolean;
  daysSinceVisit: number | null;
  avgCycleDays: number | null;
};

export default function Customers() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { userAccessible, isLoading: isSubLoading } = useIsSubscriptionAccessible();
  const { data: rawCustomers, isLoading: isCustomersLoading } = useCustomersWithRevenue();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<EnrichedCustomer | null>(null);
  // phone → currently sending
  const [notifyingPhones, setNotifyingPhones] = useState<Set<string>>(new Set());

  const needsSubscription = useMemo(() => {
    if (user?.role === 'shop_owner' && !isSubLoading) {
      const shop = user.shop as any;
      const shopAccessible = shop?.subscriptionStatus === 'active' ||
        (shop?.subscriptionStatus === 'cancelled' && shop?.subscriptionEnd && new Date(shop.subscriptionEnd) > new Date());
      return !shopAccessible && !userAccessible;
    }
    return false;
  }, [user, userAccessible, isSubLoading]);

  useEffect(() => {
    if (!isAuthLoading && !user) setLocation("/login");
    if (!isAuthLoading && !isSubLoading && needsSubscription) setLocation("/admin/subscription");
  }, [isAuthLoading, user, needsSubscription, isSubLoading, setLocation]);

  // VIP 임계값: 누적 매출 상위 20%
  const vipThreshold = useMemo(() => {
    if (!rawCustomers || rawCustomers.length === 0) return 0;
    const revenues = rawCustomers
      .map(c => c.totalRevenue)
      .filter(r => r > 0)
      .sort((a, b) => b - a);
    if (revenues.length === 0) return 0;
    const top20Index = Math.max(1, Math.ceil(revenues.length * 0.2));
    return revenues[top20Index - 1];
  }, [rawCustomers]);

  // 고객 분류 및 enrichment
  const enrichedCustomers = useMemo((): EnrichedCustomer[] => {
    if (!rawCustomers) return [];
    const now = new Date();

    return rawCustomers.map(c => {
      const daysSinceVisit = c.lastVisit ? differenceInDays(now, new Date(c.lastVisit)) : null;

      // 평균 방문 주기 계산
      let avgCycleDays: number | null = null;
      if (c.firstVisitDate && c.lastVisit && c.visitCount >= 2) {
        const totalDays = differenceInDays(new Date(c.lastVisit), new Date(c.firstVisitDate));
        avgCycleDays = totalDays / (c.visitCount - 1);
      }

      // 재방문예정: 다음 예상 방문일까지 3일 이내
      let isReturnSoon = false;
      if (avgCycleDays && avgCycleDays > 0 && c.lastVisit) {
        const nextExpectedMs = new Date(c.lastVisit).getTime() + avgCycleDays * 86400000;
        const daysUntilNext = differenceInDays(new Date(nextExpectedMs), now);
        isReturnSoon = daysUntilNext >= 0 && daysUntilNext <= 3;
      }

      return {
        ...c,
        isVip: vipThreshold > 0 && c.totalRevenue >= vipThreshold,
        isAtRisk: daysSinceVisit !== null && daysSinceVisit >= 45,
        isReturnSoon,
        daysSinceVisit,
        avgCycleDays,
      };
    });
  }, [rawCustomers, vipThreshold]);

  // 검색 필터
  const searchFiltered = useMemo(() => {
    if (!searchQuery) return enrichedCustomers;
    const q = searchQuery.toLowerCase();
    return enrichedCustomers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.petName?.toLowerCase().includes(q)
    );
  }, [enrichedCustomers, searchQuery]);

  // 탭별 필터
  const allCustomers = searchFiltered.sort((a, b) => (b.lastVisit ? new Date(b.lastVisit).getTime() : 0) - (a.lastVisit ? new Date(a.lastVisit).getTime() : 0));
  const vipCustomers = searchFiltered.filter(c => c.isVip);
  const atRiskCustomers = searchFiltered.filter(c => c.isAtRisk);
  const returnSoonCustomers = searchFiltered.filter(c => c.isReturnSoon);

  // 대시보드 통계
  const stats = useMemo(() => ({
    total: enrichedCustomers.length,
    vip: enrichedCustomers.filter(c => c.isVip).length,
    atRisk: enrichedCustomers.filter(c => c.isAtRisk).length,
    returnSoon: enrichedCustomers.filter(c => c.isReturnSoon).length,
  }), [enrichedCustomers]);

  // 재방문 알림 전송 핸들러
  const handleReturnVisitNotify = async (phone: string, customerName: string) => {
    if (notifyingPhones.has(phone)) return;
    setNotifyingPhones(prev => new Set([...prev, phone]));
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(phone)}/return-visit-notify`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: '전송 완료', description: `${customerName}님께 재방문 알림을 전송했습니다.` });
      } else {
        toast({ title: '전송 실패', description: data.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '오류', description: '알림 전송 중 오류가 발생했습니다.', variant: 'destructive' });
    } finally {
      setNotifyingPhones(prev => { const n = new Set(prev); n.delete(phone); return n; });
    }
  };

  if (isAuthLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user || needsSubscription) return null;

  return (
    <div className="min-h-screen bg-secondary/10 pb-20">
      {/* 헤더 */}
      <div className="bg-white border-b border-border shadow-sm sticky top-16 z-10">
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">고객 관리</h1>
          </div>

          {/* 대시보드 요약 카드 */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-primary/5 rounded-xl p-2.5 text-center">
              <div className="text-xl font-bold text-primary">{stats.total}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">전체</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-2.5 text-center">
              <div className="text-xl font-bold text-yellow-600">{stats.vip}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">VIP</div>
            </div>
            <div className="bg-red-50 rounded-xl p-2.5 text-center">
              <div className="text-xl font-bold text-red-500">{stats.atRisk}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">이탈위험</div>
            </div>
            <div className="bg-green-50 rounded-xl p-2.5 text-center">
              <div className="text-xl font-bold text-green-600">{stats.returnSoon}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">재방문예정</div>
            </div>
          </div>

          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="이름, 전화번호, 반려동물 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* 탭 + 고객 목록 */}
      <div className="container mx-auto px-4 py-4 max-w-3xl">
        {isCustomersLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="w-full mb-4 grid grid-cols-4 h-auto">
              <TabsTrigger value="all" className="text-xs py-2 flex flex-col gap-0.5">
                <span>전체</span>
                <span className="text-[10px] opacity-60">{stats.total}명</span>
              </TabsTrigger>
              <TabsTrigger value="vip" className="text-xs py-2 flex flex-col gap-0.5">
                <span>VIP</span>
                <span className="text-[10px] opacity-60">{stats.vip}명</span>
              </TabsTrigger>
              <TabsTrigger value="at-risk" className="text-xs py-2 flex flex-col gap-0.5">
                <span>이탈위험</span>
                <span className="text-[10px] opacity-60">{stats.atRisk}명</span>
              </TabsTrigger>
              <TabsTrigger value="return-soon" className="text-xs py-2 flex flex-col gap-0.5">
                <span>재방문예정</span>
                <span className="text-[10px] opacity-60">{stats.returnSoon}명</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <CustomerList customers={allCustomers} onSelect={setSelectedCustomer} emptyMessage="등록된 고객이 없습니다" />
            </TabsContent>
            <TabsContent value="vip">
              <CustomerList customers={vipCustomers} onSelect={setSelectedCustomer} emptyMessage="VIP 고객이 없습니다" emptyDesc={`누적 매출 상위 20% (${vipThreshold.toLocaleString()}원 이상)`} />
            </TabsContent>
            <TabsContent value="at-risk">
              {/* 이탈위험 탭에서만 알림 버튼 노출 */}
              <CustomerList
                customers={atRiskCustomers}
                onSelect={setSelectedCustomer}
                emptyMessage="이탈 위험 고객이 없습니다"
                emptyDesc="마지막 방문 후 45일 이상 경과한 고객"
                onNotify={handleReturnVisitNotify}
                notifyingPhones={notifyingPhones}
              />
            </TabsContent>
            <TabsContent value="return-soon">
              <CustomerList customers={returnSoonCustomers} onSelect={setSelectedCustomer} emptyMessage="재방문 예정 고객이 없습니다" emptyDesc="평균 방문 주기 기준 3일 이내 방문 예상" />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* 고객 상세 Sheet */}
      <CustomerDetailSheet
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
}

// 고객 목록 컴포넌트
function CustomerList({
  customers,
  onSelect,
  emptyMessage,
  emptyDesc,
  onNotify,
  notifyingPhones,
}: {
  customers: EnrichedCustomer[];
  onSelect: (c: EnrichedCustomer) => void;
  emptyMessage: string;
  emptyDesc?: string;
  onNotify?: (phone: string, name: string) => void;
  notifyingPhones?: Set<string>;
}) {
  if (customers.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-border">
        <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">{emptyMessage}</h3>
        {emptyDesc && <p className="text-sm text-muted-foreground mt-1">{emptyDesc}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {customers.map((customer) => (
        <CustomerRow
          key={customer.id}
          customer={customer}
          onSelect={onSelect}
          onNotify={onNotify}
          isNotifying={notifyingPhones?.has(customer.phone) ?? false}
        />
      ))}
    </div>
  );
}

// 경과일 색상 및 아이콘 결정
function getDaysSinceStyle(days: number | null): { className: string; icon: string } {
  if (days === null) return { className: 'text-muted-foreground', icon: '' };
  if (days >= 60) return { className: 'text-red-500 font-semibold', icon: '🔥' };
  if (days >= 45) return { className: 'text-orange-500 font-semibold', icon: '' };
  if (days >= 30) return { className: 'text-yellow-500', icon: '' };
  return { className: 'text-muted-foreground', icon: '' };
}

// 고객 행 컴포넌트
// onNotify가 전달된 경우(이탈위험 탭) 알림 버튼 노출.
// 중첩 button을 피하기 위해 외부 컨테이너는 div로 처리.
function CustomerRow({
  customer,
  onSelect,
  onNotify,
  isNotifying,
}: {
  customer: EnrichedCustomer;
  onSelect: (c: EnrichedCustomer) => void;
  onNotify?: (phone: string, name: string) => void;
  isNotifying?: boolean;
}) {
  const dayStyle = getDaysSinceStyle(customer.daysSinceVisit);

  return (
    <div className="w-full bg-white rounded-xl border border-border overflow-hidden">
      {/* 메인 영역 — 클릭 시 상세 시트 오픈 */}
      <div
        className="px-4 py-3 hover:bg-secondary/20 active:bg-secondary/30 transition-colors cursor-pointer"
        onClick={() => onSelect(customer)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(customer)}
      >
        <div className="flex items-center gap-3">
          {/* 아바타 */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {customer.name.charAt(0)}
            </div>
            {customer.isVip && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                <Award className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>

          {/* 이름 + 배지 + 부가정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm">{customer.name}</span>
              {customer.isVip && (
                <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">VIP</span>
              )}
              {customer.isAtRisk && (
                <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                  <AlertCircle className="w-2.5 h-2.5" /> {customer.daysSinceVisit}일 미방문
                </span>
              )}
              {customer.isReturnSoon && (
                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                  <RefreshCw className="w-2.5 h-2.5" /> 재방문예정
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              {customer.petName && (
                <span className="flex items-center gap-0.5">
                  <PawPrint className="w-3 h-3" /> {customer.petName}
                </span>
              )}
              {customer.lastVisit && (
                <span className="flex items-center gap-0.5">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(customer.lastVisit), 'M월 d일', { locale: ko })}
                </span>
              )}
            </div>
          </div>

          {/* 매출 + 방문 횟수 + 경과일 */}
          <div className="flex-shrink-0 text-right">
            <div className="text-xs font-bold text-primary">
              {customer.totalRevenue > 0 ? `${customer.totalRevenue.toLocaleString()}원` : '-'}
            </div>
            <div className="text-[10px] text-muted-foreground">{customer.visitCount}회 방문</div>
            {customer.daysSinceVisit !== null && (
              <div className={`text-[10px] mt-0.5 ${dayStyle.className}`}>
                {dayStyle.icon && <span className="mr-0.5">{dayStyle.icon}</span>}
                {customer.daysSinceVisit}일 경과
              </div>
            )}
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>
      </div>

      {/* 재방문 알림 버튼 — 이탈위험 탭에서만 표시 */}
      {onNotify && (
        <div className="px-4 pb-3 pt-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs h-8 border-dashed"
            onClick={() => onNotify(customer.phone, customer.name)}
            disabled={isNotifying}
          >
            {isNotifying
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <MessageCircle className="w-3.5 h-3.5" />}
            재방문 알림 전송
          </Button>
        </div>
      )}
    </div>
  );
}
