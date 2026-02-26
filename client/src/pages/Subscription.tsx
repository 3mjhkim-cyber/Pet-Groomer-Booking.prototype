import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Check, CreditCard, Building, ArrowLeft, AlertTriangle,
  CalendarDays, Receipt, ChevronRight, FileText,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Shop } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

// ─────────────────────────────────────────────────────────────────
// 요금제 정의
// ─────────────────────────────────────────────────────────────────
const SUBSCRIPTION_PLANS = [
  {
    tier: "basic",
    name: "베이직",
    price: 29000,
    features: ["월 200건 예약 관리", "고객 정보 관리", "예약 캘린더", "기본 통계", "카카오톡 알림"],
  },
  {
    tier: "premium",
    name: "프리미엄",
    price: 49000,
    features: [
      "무제한 예약 관리", "고객 정보 관리", "예약 캘린더",
      "고급 통계 및 매출 분석", "카카오톡 알림", "예약금 관리", "리마인드 자동 전송", "우선 지원",
    ],
    popular: true,
  },
  {
    tier: "enterprise",
    name: "엔터프라이즈",
    price: 99000,
    features: ["프리미엄의 모든 기능", "다중 지점 관리", "직원 계정 관리", "API 연동", "맞춤형 개발 지원", "전담 매니저"],
  },
];

const PAYMENT_METHOD_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  CARD:          { label: "신용/체크카드", icon: <CreditCard className="w-4 h-4" /> },
  TRANSFER:      { label: "계좌이체",      icon: <Building   className="w-4 h-4" /> },
  card:          { label: "신용/체크카드", icon: <CreditCard className="w-4 h-4" /> },
  bank_transfer: { label: "계좌이체",      icon: <Building   className="w-4 h-4" /> },
};

const CANCEL_REASONS = [
  "요금제 비용이 너무 비쌉니다",
  "원하는 기능이 없습니다",
  "서비스에 만족하지 않습니다",
  "해당 서비스가 더 이상 필요 없습니다",
];

// ─────────────────────────────────────────────────────────────────
// [헬퍼] 구독 이용 가능 여부
//  - active: 항상 이용 가능
//  - cancelled + 만료일이 오늘 이후: 아직 이용 가능
//  - 그 외(만료·없음): 이용 불가 → 요금제 선택 화면으로 이동
// ─────────────────────────────────────────────────────────────────
function isSubscriptionAccessible(shop: any): boolean {
  if (!shop) return false;
  if (shop.subscriptionStatus === "active") return true;
  if (shop.subscriptionStatus === "cancelled" && shop.subscriptionEnd) {
    return new Date(shop.subscriptionEnd) > new Date();
  }
  return false;
}

export default function Subscription() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── 뷰: 'plans' = 요금제 선택, 'manage' = 구독 관리 ────────────────────
  // 기본값은 'manage' 이지만, 구독이 없거나 만료된 경우에는
  // accessible === false 로 판정되어 자동으로 'plans' 뷰가 렌더된다.
  const [view, setView] = useState<"manage" | "plans">("manage");
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank_transfer">("card");

  // ── 데모 결제 상태 (PortOne 키가 없을 때 사용) ────────────────────────
  const [showDemoDialog,    setShowDemoDialog]    = useState(false);
  const [demoPaymentTier,   setDemoPaymentTier]   = useState<string>("");
  const [demoPaymentPrice,  setDemoPaymentPrice]  = useState<number>(0);
  const [isDemoProcessing,  setIsDemoProcessing]  = useState(false);

  // PortOne 실결제 처리 중 상태 (버튼 중복 클릭 방지)
  const [isPaying, setIsPaying] = useState(false);

  // ── 결제수단 업데이트 모달 ──────────────────────────────────────────────
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState<string | null>(null);

  // ── 취소 모달 ──────────────────────────────────────────────────────────
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason,    setCancelReason]    = useState("");
  const [cancelNote,      setCancelNote]      = useState("");

  // ── PortOne 설정 여부 (환경 변수로 판단) ──────────────────────────────
  const isPortOneConfigured = !!(
    import.meta.env.VITE_PORTONE_STORE_ID &&
    import.meta.env.VITE_PORTONE_CHANNEL_KEY
  );

  // ── API ──────────────────────────────────────────────────────────────
  const { data: shop, isLoading: isShopLoading } = useQuery<Shop>({
    queryKey: ["/api/shop/settings"],
    enabled: !!user && user.role === "shop_owner",
  });

  const { data: subscriptionHistory } = useQuery<any[]>({
    queryKey: ["/api/subscriptions/my"],
    enabled: !!user && user.role === "shop_owner",
  });

  // ── Mutation: 구독 취소 ────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await apiRequest("POST", "/api/subscriptions/cancel", { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/my"] });
      setShowCancelModal(false);
      toast({ title: "구독이 취소되었습니다", description: "현재 구독 기간 만료 후 서비스가 종료됩니다." });
    },
    onError: () => {
      toast({ title: "취소 실패", description: "구독 취소 중 오류가 발생했습니다.", variant: "destructive" });
    },
  });

  // ── Mutation: 결제수단 변경 ────────────────────────────────────────────
  const updatePaymentMethodMutation = useMutation({
    mutationFn: async (pm: string) => {
      const res = await apiRequest("POST", "/api/subscriptions/update-payment-method", { paymentMethod: pm });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/my"] });
      setShowPaymentModal(false);
      setNewPaymentMethod(null);
      toast({ title: "결제 수단이 업데이트되었습니다" });
    },
    onError: () => {
      toast({ title: "업데이트 실패", description: "결제 수단 변경 중 오류가 발생했습니다.", variant: "destructive" });
    },
  });

  const [showDemoDialog, setShowDemoDialog] = useState(false);
  const [demoPaymentTier, setDemoPaymentTier] = useState<string | null>(null);
  const [demoPaymentPrice, setDemoPaymentPrice] = useState<number>(0);
  const [isDemoProcessing, setIsDemoProcessing] = useState(false);

  const isPortOneConfigured = !!(import.meta.env.VITE_PORTONE_STORE_ID && import.meta.env.VITE_PORTONE_CHANNEL_KEY);

  const handleDemoPayment = async () => {
    if (!demoPaymentTier) return;
    setIsDemoProcessing(true);
    try {
      const res = await apiRequest("POST", "/api/payment/demo-confirm", {
        tier:   demoPaymentTier,
        amount: demoPaymentPrice,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "결제 처리에 실패했습니다.");
      }
      setShowDemoDialog(false);
      toast({
        title: "결제 완료!",
        description: "구독이 성공적으로 활성화되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shop/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/my'] });
      setTimeout(() => setLocation('/admin/dashboard'), 1500);
    } catch (error: any) {
      toast({ title: "결제 오류", description: error.message || "결제를 처리할 수 없습니다.", variant: "destructive" });
    } finally {
      setIsDemoProcessing(false);
    }
  };

  // ── 결제 시작 ─────────────────────────────────────────────────────────
  // [흐름]
  //  1) PortOne 키 미설정 → 데모 다이얼로그 표시
  //  2) PortOne requestPayment() 호출
  //     a) response === undefined  : 리다이렉트 결제 (카카오페이 등)
  //                                  → 브라우저가 redirectUrl로 이동
  //                                  → PaymentSuccess.tsx 가 /api/payment/confirm 처리
  //     b) response.code 있음      : 결제 실패/취소 → 에러 토스트
  //     c) response.code 없음      : 인앱 결제 성공 (카드 등)
  //                                  → 직접 /api/payment/confirm 호출해 구독 활성화  ← 핵심
  const handlePayment = async (tier: string, price: number) => {
    if (!isPortOneConfigured) {
      setDemoPaymentTier(tier);
      setDemoPaymentPrice(price);
      setShowDemoDialog(true);
      return;
    }

    setIsPaying(true);
    try {
      const PortOne = (await import("@portone/browser-sdk/v2")).default;
      const storeId    = import.meta.env.VITE_PORTONE_STORE_ID;
      const channelKey = import.meta.env.VITE_PORTONE_CHANNEL_KEY;
      if (!storeId || !channelKey) {
        toast({ title: "설정 오류", description: "결제 시스템이 설정되지 않았습니다.", variant: "destructive" });
        return;
      }

      const planName  = SUBSCRIPTION_PLANS.find((p) => p.tier === tier)?.name || tier;
      // 결제 ID는 클라이언트에서 생성해 요청하고, 서버 검증 시 동일한 ID를 사용한다
      const paymentId = `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const response = await PortOne.requestPayment({
        storeId,
        paymentId,
        orderName:   `구독 플랜: ${planName}`,
        totalAmount: price,
        currency:    "CURRENCY_KRW",
        channelKey,
        payMethod:   paymentMethod === "card" ? "CARD" : "TRANSFER",
        customer:    { fullName: shop?.name || user?.username || "고객" },
        // 리다이렉트 결제(카카오페이 등)는 이 URL로 돌아온 뒤 PaymentSuccess.tsx 가 처리
        redirectUrl: `${window.location.origin}/payment/success?tier=${tier}`,
      });

      // [케이스 1] response === undefined → 리다이렉트 결제가 진행 중
      //            브라우저가 이미 redirectUrl로 이동했으므로 여기서는 아무것도 하지 않는다
      if (!response) return;

      // [케이스 2] response.code 있음 → 결제 실패 또는 사용자 취소
      if (response.code) {
        toast({
          title: "결제 실패",
          description: response.message || "결제가 취소되었습니다.",
          variant: "destructive",
        });
        return;
      }

      // [케이스 3] 인앱(팝업/iframe) 결제 성공 → 서버에서 결제 검증 후 구독 활성화
      const confirmRes = await fetch("/api/payment/confirm", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          paymentId: response.paymentId ?? paymentId, // 응답에 포함된 ID 우선, 없으면 생성한 ID 사용
          txId:      response.txId,
          tier,
        }),
      });

      if (!confirmRes.ok) {
        const err = await confirmRes.json();
        toast({
          title: "결제 검증 실패",
          description: err.message || "서버 검증 중 오류가 발생했습니다.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "결제 완료!", description: "구독이 성공적으로 활성화되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setTimeout(() => setLocation("/admin/dashboard"), 1500);

    } catch (error: any) {
      toast({ title: "결제 오류", description: error.message || "결제를 시작할 수 없습니다.", variant: "destructive" });
    } finally {
      setIsPaying(false);
    }
  };

  // ── 인증 가드 ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthLoading && !isShopLoading && (!user || user.role !== "shop_owner")) {
      setLocation("/login");
    }
  }, [isAuthLoading, isShopLoading, user, setLocation]);

  if (isAuthLoading || isShopLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "shop_owner") {
    return null;
  }

  // ── 구독 상태 파생값 ──────────────────────────────────────────────────
  const accessible           = isSubscriptionAccessible(shop);
  const hasActive            = shop?.subscriptionStatus === "active";
  const isCancelledButValid  = shop?.subscriptionStatus === "cancelled" && accessible;
  const latestSub            = subscriptionHistory && subscriptionHistory.length > 0
    ? subscriptionHistory[subscriptionHistory.length - 1] : null;
  const currentPlan = SUBSCRIPTION_PLANS.find((p) => p.tier === shop?.subscriptionTier);
  const renewDate   = shop?.subscriptionEnd
    ? new Date(shop.subscriptionEnd).toLocaleDateString("ko-KR") : "-";

  // ─────────────────────────────────────────────────────────────────────
  // [요금제 선택 뷰]
  //   진입 조건:
  //   1) 구독이 없거나 만료된 경우 (!accessible) — 신규·만료 사용자
  //   2) 기존 구독자가 '요금제 조정' 버튼을 눌렀을 때 (view === "plans")
  // ─────────────────────────────────────────────────────────────────────
  if (view === "plans" || !accessible) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            {/* 기존 구독자만 '뒤로 가기' 표시 */}
            {accessible && (
              <Button variant="ghost" size="icon" onClick={() => setView("manage")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold">요금제 선택</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {accessible
                  ? "현재 플랜을 변경하거나 업그레이드하세요."
                  : "서비스를 이용하려면 구독 플랜을 선택해주세요."}
              </p>
            </div>
          </div>

          {/* 플랜 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <Card
                key={plan.tier}
                className={[
                  "relative",
                  plan.popular ? "border-primary shadow-lg" : "",
                  selectedTier === plan.tier ? "ring-2 ring-primary" : "",
                ].join(" ")}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">인기</Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price.toLocaleString()}원</span>
                    <span className="text-muted-foreground">/월</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={selectedTier === plan.tier ? "default" : "outline"}
                    onClick={() => setSelectedTier(plan.tier)}
                    disabled={shop?.subscriptionTier === plan.tier && hasActive}
                  >
                    {shop?.subscriptionTier === plan.tier && hasActive ? "현재 플랜" : "선택하기"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 결제 정보 (플랜 선택 후 노출) */}
          {selectedTier && (
            <Card>
              <CardHeader>
                <CardTitle>결제 정보</CardTitle>
                <CardDescription>
                  {SUBSCRIPTION_PLANS.find((p) => p.tier === selectedTier)?.name} 플랜을 선택하셨습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-3 block">결제 방법</label>
                  <div className="grid grid-cols-2 gap-4">
                    {(["card", "bank_transfer"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={[
                          "p-4 border-2 rounded-lg flex items-center gap-3 transition-colors",
                          paymentMethod === m ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                        ].join(" ")}
                      >
                        {m === "card" ? <CreditCard className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                        <div className="text-left">
                          <div className="font-medium">{m === "card" ? "신용/체크카드" : "계좌이체"}</div>
                          <div className="text-xs text-muted-foreground">{m === "card" ? "즉시 결제" : "1-2일 소요"}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">플랜</span>
                    <span className="font-medium">{SUBSCRIPTION_PLANS.find((p) => p.tier === selectedTier)?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">기간</span>
                    <span className="font-medium">1개월</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-semibold">총 결제 금액</span>
                    <span className="text-xl font-bold text-primary">
                      {SUBSCRIPTION_PLANS.find((p) => p.tier === selectedTier)?.price.toLocaleString()}원
                    </span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• 구독은 매월 자동으로 갱신됩니다.</p>
                  <p>• 구독 취소는 언제든지 가능하며, 다음 결제일부터 적용됩니다.</p>
                  <p>• 환불 정책은 이용약관을 참고해주세요.</p>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={isPaying}
                  onClick={() => {
                    const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === selectedTier);
                    if (plan) handlePayment(selectedTier!, plan.price);
                  }}
                >
                  {isPaying
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <CreditCard className="w-4 h-4 mr-2" />
                  }
                  {isPaying ? "결제 처리 중..." : "결제하기"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── 데모 결제 다이얼로그 (PortOne 미설정 시) ── */}
        <Dialog open={showDemoDialog} onOpenChange={setShowDemoDialog}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>결제 확인 (테스트)</DialogTitle>
              <DialogDescription>
                {SUBSCRIPTION_PLANS.find((p) => p.tier === demoPaymentTier)?.name} 플랜을{" "}
                <strong>{demoPaymentPrice.toLocaleString()}원</strong>에 구독하시겠습니까?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDemoDialog(false)} disabled={isDemoProcessing}>
                취소
              </Button>
              <Button onClick={handleDemoConfirm} disabled={isDemoProcessing}>
                {isDemoProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                결제 완료
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // [구독 관리 뷰]
  //   진입 조건: accessible === true (active 또는 cancelled + 유효 기간 내)
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">구독 관리</h1>
        </div>

        {/* 취소 예정 배너 */}
        {isCancelledButValid && (
          <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              갱신 취소가 예약됨.{" "}
              <strong>{renewDate}</strong>까지 {currentPlan?.name} 요금제를 계속 이용하실 수 있습니다.
            </span>
          </div>
        )}

        {/* 현재 요금제 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-xs text-muted-foreground mb-1">현재 요금제</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{currentPlan?.name || "-"} 요금제</span>
                  <Badge variant="secondary">월간</Badge>
                  {isCancelledButValid && (
                    <Badge variant="outline" className="text-orange-600 border-orange-300">취소 예정</Badge>
                  )}
                </div>
              </div>
              <span className="text-lg font-bold text-primary">
                {currentPlan?.price.toLocaleString()}원
                <span className="text-sm font-normal text-muted-foreground">/월</span>
              </span>
            </div>
            {hasActive && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
                <CalendarDays className="w-4 h-4" />
                구독이 <strong>{renewDate}</strong>에 자동으로 갱신됩니다.
              </p>
            )}
            {!isCancelledButValid && (
              <Button variant="outline" className="mt-4 w-full sm:w-auto" onClick={() => setView("plans")}>
                요금제 조정
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>

        {/* 결제 수단 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">결제</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 rounded bg-muted flex items-center justify-center text-muted-foreground">
                  {latestSub?.paymentMethod
                    ? (PAYMENT_METHOD_LABELS[latestSub.paymentMethod]?.icon || <CreditCard className="w-4 h-4" />)
                    : <CreditCard className="w-4 h-4" />}
                </div>
                <span className="text-sm font-medium">
                  {latestSub?.paymentMethod
                    ? (PAYMENT_METHOD_LABELS[latestSub.paymentMethod]?.label || latestSub.paymentMethod)
                    : "결제 수단 없음"}
                </span>
              </div>
              {hasActive && (
                <Button
                  variant="outline" size="sm"
                  onClick={() => { setNewPaymentMethod(latestSub?.paymentMethod || null); setShowPaymentModal(true); }}
                >
                  업데이트
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 청구서 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              청구서
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!subscriptionHistory || subscriptionHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 pb-6">청구 내역이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left  px-6 py-2 text-xs text-muted-foreground font-medium">날짜</th>
                      <th className="text-left  px-4 py-2 text-xs text-muted-foreground font-medium">총계</th>
                      <th className="text-left  px-4 py-2 text-xs text-muted-foreground font-medium">상태</th>
                      <th className="text-right px-6 py-2 text-xs text-muted-foreground font-medium">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...subscriptionHistory].reverse().map((sub: any) => (
                      <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-6 py-3 text-sm">
                          {new Date(sub.createdAt || sub.startDate).toLocaleDateString("ko-KR")}
                        </td>
                        <td className="px-4 py-3 font-medium">₩{(sub.amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              sub.status === "active" || sub.status === "cancelled"
                                ? "text-green-700 border-green-200 bg-green-50"
                                : "text-muted-foreground"
                            }
                          >
                            {sub.status === "active" || sub.status === "cancelled"
                              ? "결제됨"
                              : sub.status === "expired"
                              ? "만료"
                              : sub.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <Button
                            variant="ghost" size="sm" className="h-7 text-xs gap-1"
                            onClick={() => {
                              const info = [
                                "청구서",
                                `날짜: ${new Date(sub.createdAt || sub.startDate).toLocaleDateString("ko-KR")}`,
                                `플랜: ${SUBSCRIPTION_PLANS.find(p => p.tier === sub.tier)?.name || sub.tier}`,
                                `금액: ₩${(sub.amount || 0).toLocaleString()}`,
                                `기간: ${new Date(sub.startDate).toLocaleDateString("ko-KR")} ~ ${new Date(sub.endDate).toLocaleDateString("ko-KR")}`,
                              ].join("\n");
                              alert(info);
                            }}
                          >
                            <FileText className="w-3 h-3" />
                            청구서 보기
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 취소 섹션 */}
        {hasActive && (
          <Card className="border-destructive/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-destructive">요금제 취소</CardTitle>
              <CardDescription>
                구독을 취소하면 {renewDate} 이후 모든 기능에 대한 액세스 권한을 잃게 됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white"
                onClick={() => setShowCancelModal(true)}
              >
                취소
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── 결제수단 업데이트 모달 ── */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>결제 수단 업데이트</DialogTitle>
            <DialogDescription>해당 방식으로 계속 결제 하시겠습니까?</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <button
              className={[
                "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors",
                newPaymentMethod === latestSub?.paymentMethod ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              ].join(" ")}
              onClick={() => setNewPaymentMethod(latestSub?.paymentMethod || "CARD")}
            >
              <div className="w-8 h-6 rounded bg-muted flex items-center justify-center">
                {latestSub?.paymentMethod
                  ? (PAYMENT_METHOD_LABELS[latestSub.paymentMethod]?.icon || <CreditCard className="w-3 h-3" />)
                  : <CreditCard className="w-3 h-3" />}
              </div>
              <span className="text-sm font-medium">
                {latestSub?.paymentMethod
                  ? `${PAYMENT_METHOD_LABELS[latestSub.paymentMethod]?.label || latestSub.paymentMethod} 사용`
                  : "기존 수단 사용"}
              </span>
            </button>
            <button
              className={[
                "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors",
                newPaymentMethod === "other" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              ].join(" ")}
              onClick={() => setNewPaymentMethod("other")}
            >
              <div className="w-8 h-6 rounded bg-muted flex items-center justify-center">
                <Building className="w-3 h-3" />
              </div>
              <span className="text-sm font-medium">다른 방식으로 결제</span>
            </button>
            {newPaymentMethod === "other" && (
              <div className="pl-11 space-y-2">
                {(["CARD", "TRANSFER"] as const).map((m) => (
                  <label
                    key={m}
                    className={[
                      "flex items-center gap-2 p-2 rounded-md border cursor-pointer",
                      newPaymentMethod === m ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                    ].join(" ")}
                  >
                    <input
                      type="radio" name="altMethod" value={m}
                      onChange={() => setNewPaymentMethod(m)}
                      className="accent-primary"
                    />
                    <span className="text-sm">{m === "CARD" ? "신용/체크카드" : "계좌이체"}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>취소</Button>
            <Button
              disabled={!newPaymentMethod || newPaymentMethod === "other" || updatePaymentMethodMutation.isPending}
              onClick={() => newPaymentMethod && newPaymentMethod !== "other" && updatePaymentMethodMutation.mutate(newPaymentMethod)}
            >
              {updatePaymentMethodMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              계속
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 구독 취소 모달 ── */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>요금제 취소</DialogTitle>
            <DialogDescription>
              취소하면 정기 결제가 중단됩니다.{" "}
              <strong>{renewDate}</strong>까지는{" "}
              <strong>{currentPlan?.name || shop?.subscriptionTier}</strong> 요금제를 계속 사용하실 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              {CANCEL_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={[
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    cancelReason === reason ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                  ].join(" ")}
                >
                  <input
                    type="radio" name="cancelReason" value={reason}
                    checked={cancelReason === reason}
                    onChange={() => setCancelReason(reason)}
                    className="accent-primary w-4 h-4 flex-shrink-0"
                  />
                  <span className="text-sm">{reason}</span>
                </label>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">추가 의견이 있으신가요?</Label>
              <Textarea
                placeholder="의견을 입력해주세요 (선택사항)"
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>뒤로 가기</Button>
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() =>
                cancelMutation.mutate(
                  cancelReason
                    ? `${cancelReason}${cancelNote ? ` / ${cancelNote}` : ""}`
                    : cancelNote
                )
              }
            >
              {cancelMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              요금제 취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDemoDialog} onOpenChange={setShowDemoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              데모 결제 모드
            </DialogTitle>
            <DialogDescription>
              현재 PG사(포트원) 연동 전이므로 데모 모드로 결제가 진행됩니다.
              실제 결제는 이루어지지 않으며, 구독이 즉시 활성화됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">플랜</span>
              <span className="font-medium">
                {SUBSCRIPTION_PLANS.find(p => p.tier === demoPaymentTier)?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">결제 금액</span>
              <span className="font-bold text-primary">
                {demoPaymentPrice.toLocaleString()}원
              </span>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDemoDialog(false)} disabled={isDemoProcessing}>
              취소
            </Button>
            <Button onClick={handleDemoPayment} disabled={isDemoProcessing} data-testid="button-demo-payment-confirm">
              {isDemoProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />처리 중...</>
              ) : (
                <><CreditCard className="w-4 h-4 mr-2" />결제 확인 (데모)</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
