import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, CreditCard, Building, ArrowLeft } from "lucide-react";
import type { Shop } from "@shared/schema";
import PortOne from "@portone/browser-sdk/v2";

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

export default function Subscription() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank_transfer">("card");

  const { data: shop, isLoading: isShopLoading } = useQuery<Shop>({
    queryKey: ['/api/shop/settings'],
    enabled: !!user && user.role === 'shop_owner',
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
            <h1 className="text-3xl font-bold">구독 플랜 선택</h1>
            <p className="text-muted-foreground mt-2">
              {hasActiveSubscription
                ? "현재 구독 중인 플랜을 변경하거나 업그레이드하세요."
                : "서비스를 이용하려면 구독 플랜을 선택해주세요."}
            </p>
          </div>
        </div>

        {shop && hasActiveSubscription && (
          <Card className="mb-8 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                현재 구독 중
              </CardTitle>
              <CardDescription>
                {SUBSCRIPTION_PLANS.find(p => p.tier === shop.subscriptionTier)?.name} 플랜 |
                만료일: {shop.subscriptionEnd ? new Date(shop.subscriptionEnd).toLocaleDateString('ko-KR') : '-'}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

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
    </div>
  );
}
