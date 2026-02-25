import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, CreditCard, Building, ArrowLeft, AlertTriangle, CalendarDays, Receipt } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Shop } from "@shared/schema";
import PortOne from "@portone/browser-sdk/v2";
import { apiRequest } from "@/lib/queryClient";

const SUBSCRIPTION_PLANS = [
  {
    tier: "basic",
    name: "베이직",
    price: 29000,
    features: [
      "월 200건 예약 관리",
      "고객 정보 관리",
      "예약 캘린더",
      "기본 통계",
      "카카오톡 알림",
    ],
  },
  {
    tier: "premium",
    name: "프리미엄",
    price: 49000,
    features: [
      "무제한 예약 관리",
      "고객 정보 관리",
      "예약 캘린더",
      "고급 통계 및 매출 분석",
      "카카오톡 알림",
      "예약금 관리",
      "리마인드 자동 전송",
      "우선 지원",
    ],
    popular: true,
  },
  {
    tier: "enterprise",
    name: "엔터프라이즈",
    price: 99000,
    features: [
      "프리미엄의 모든 기능",
      "다중 지점 관리",
      "직원 계정 관리",
      "API 연동",
      "맞춤형 개발 지원",
      "전담 매니저",
    ],
  },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CARD: "신용/체크카드",
  TRANSFER: "계좌이체",
  card: "신용/체크카드",
  bank_transfer: "계좌이체",
};

export default function Subscription() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank_transfer">("card");
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: shop, isLoading: isShopLoading } = useQuery<Shop>({
    queryKey: ['/api/shop/settings'],
    enabled: !!user && user.role === 'shop_owner',
  });

  const { data: subscriptionHistory } = useQuery<any[]>({
    queryKey: ['/api/subscriptions/my'],
    enabled: !!user && user.role === 'shop_owner',
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/subscriptions/cancel');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shop/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/my'] });
      toast({ title: "구독 해지 완료", description: "구독이 해지되었습니다. 현재 기간 만료 후 서비스가 종료됩니다." });
      setShowCancelDialog(false);
    },
    onError: () => {
      toast({ title: "해지 실패", description: "구독 해지 중 오류가 발생했습니다.", variant: "destructive" });
    },
  });

  // 포트원 결제 시작
  const handlePayment = async (tier: string, price: number) => {
    try {
      const storeId = import.meta.env.VITE_PORTONE_STORE_ID;
      const channelKey = import.meta.env.VITE_PORTONE_CHANNEL_KEY;
      if (!storeId || !channelKey) {
        toast({
          title: "설정 오류",
          description: "결제 시스템이 설정되지 않았습니다.",
          variant: "destructive",
        });
        return;
      }

      const planName = SUBSCRIPTION_PLANS.find(p => p.tier === tier)?.name || tier;
      const paymentId = `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const response = await PortOne.requestPayment({
        storeId,
        paymentId,
        orderName: `구독 플랜: ${planName}`,
        totalAmount: price,
        currency: "CURRENCY_KRW",
        channelKey,
        payMethod: paymentMethod === "card" ? "CARD" : "TRANSFER",
        customer: {
          fullName: shop?.name || user?.username || '고객',
        },
        redirectUrl: `${window.location.origin}/payment/success?tier=${tier}`,
      });

      if (response?.code) {
        toast({
          title: "결제 실패",
          description: response.message || "결제가 취소되었습니다.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "결제 오류",
        description: error.message || "결제를 시작할 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  if (isAuthLoading || isShopLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'shop_owner') {
    setLocation("/login");
    return null;
  }

  const hasActiveSubscription = shop?.subscriptionStatus === 'active';
  const latestSubscription = subscriptionHistory && subscriptionHistory.length > 0
    ? subscriptionHistory[subscriptionHistory.length - 1]
    : null;
  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.tier === shop?.subscriptionTier);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin/dashboard")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">구독 관리</h1>
            <p className="text-muted-foreground mt-2">
              {hasActiveSubscription
                ? "현재 구독 중인 플랜을 관리하거나 변경하세요."
                : "서비스를 이용하려면 구독 플랜을 선택해주세요."}
            </p>
          </div>
        </div>

        {/* 현재 구독 정보 */}
        {shop && hasActiveSubscription && (
          <Card className="mb-8 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                현재 구독 중
                <Badge className="ml-2">{currentPlan?.name || shop.subscriptionTier}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">결제 금액</p>
                    <p className="font-semibold">{currentPlan?.price.toLocaleString()}원/월</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarDays className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">다음 갱신일</p>
                    <p className="font-semibold">
                      {shop.subscriptionEnd
                        ? new Date(shop.subscriptionEnd).toLocaleDateString('ko-KR')
                        : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Receipt className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">결제 수단</p>
                    <p className="font-semibold">
                      {latestSubscription?.paymentMethod
                        ? (PAYMENT_METHOD_LABELS[latestSubscription.paymentMethod] || latestSubscription.paymentMethod)
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                onClick={() => setShowCancelDialog(true)}
              >
                구독 해지
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 해지된/만료된 구독 안내 */}
        {shop && !hasActiveSubscription && shop.subscriptionStatus !== 'none' && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="w-5 h-5" />
                {shop.subscriptionStatus === 'cancelled' ? '구독이 해지되었습니다' : '구독이 만료되었습니다'}
              </CardTitle>
              <CardDescription className="text-orange-600">
                아래에서 새 플랜을 선택하여 서비스를 다시 이용하세요.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* 플랜 선택 */}
        <h2 className="text-xl font-semibold mb-4">
          {hasActiveSubscription ? "플랜 변경" : "플랜 선택"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <Card
              key={plan.tier}
              className={`relative ${
                plan.popular ? 'border-primary shadow-lg' : ''
              } ${selectedTier === plan.tier ? 'ring-2 ring-primary' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  인기
                </Badge>
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
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={selectedTier === plan.tier ? "default" : "outline"}
                  onClick={() => setSelectedTier(plan.tier)}
                  disabled={shop?.subscriptionTier === plan.tier && hasActiveSubscription}
                >
                  {shop?.subscriptionTier === plan.tier && hasActiveSubscription
                    ? "현재 플랜"
                    : "선택하기"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 결제 정보 */}
        {selectedTier && (
          <Card>
            <CardHeader>
              <CardTitle>결제 정보</CardTitle>
              <CardDescription>
                {SUBSCRIPTION_PLANS.find(p => p.tier === selectedTier)?.name} 플랜을 선택하셨습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-3 block">결제 방법</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-colors ${
                      paymentMethod === "card"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">신용/체크카드</div>
                      <div className="text-xs text-muted-foreground">즉시 결제</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("bank_transfer")}
                    className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-colors ${
                      paymentMethod === "bank_transfer"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Building className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">계좌이체</div>
                      <div className="text-xs text-muted-foreground">1-2일 소요</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">플랜</span>
                  <span className="font-medium">
                    {SUBSCRIPTION_PLANS.find(p => p.tier === selectedTier)?.name}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">기간</span>
                  <span className="font-medium">1개월</span>
                </div>
                <div className="border-t border-border my-3"></div>
                <div className="flex justify-between">
                  <span className="font-semibold">총 결제 금액</span>
                  <span className="text-xl font-bold text-primary">
                    {SUBSCRIPTION_PLANS.find(p => p.tier === selectedTier)?.price.toLocaleString()}원
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
                onClick={() => {
                  const plan = SUBSCRIPTION_PLANS.find(p => p.tier === selectedTier);
                  if (plan) {
                    handlePayment(selectedTier!, plan.price);
                  }
                }}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                결제하기
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 구독 해지 확인 다이얼로그 */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>구독을 해지하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              구독을 해지하면 현재 구독 기간({shop?.subscriptionEnd ? new Date(shop.subscriptionEnd).toLocaleDateString('ko-KR') : ''}) 만료 후 서비스 이용이 중단됩니다.
              <br /><br />
              해지 후에도 만료일까지는 계속 사용하실 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              해지하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
