/**
 * Subscription.tsx — 구독 관리 페이지 (/admin/subscription)
 *
 * 상태별 뷰:
 *   none            → 서비스 소개 + 무료체험 시작 버튼
 *   trialing        → 체험 중 (D-3 이하이면 결제 유도 배너 표시)
 *   pending_payment → 체험 만료 / 결제 필요 (잠금)
 *   active          → 구독 관리 (플랜 / 결제수단 / 청구서 / 취소)
 *   past_due        → 결제 실패 (카드 재등록 유도)
 *   cancelled       → 해지 완료
 */

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Check, CreditCard, ArrowLeft, AlertTriangle,
  CalendarDays, Lock, RefreshCw, Scissors,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";

// ─── 플랜 정의 ─────────────────────────────────────────────────────────────────
const PLAN = {
  price: 29_000,
  name: "스탠다드",
  features: [
    "무제한 예약 관리",
    "고객 정보 관리 및 이력 조회",
    "예약 캘린더",
    "통계 및 매출 분석",
    "카카오톡 / SMS 알림",
    "예약금 관리",
    "방문 리마인드 전송",
    "이용 고객 분석",
  ],
};

const CANCEL_REASONS = [
  "요금이 너무 비쌉니다",
  "원하는 기능이 없습니다",
  "서비스에 만족하지 않습니다",
  "서비스가 더 이상 필요 없습니다",
];

// ─── 타입 ──────────────────────────────────────────────────────────────────────
type SubStatus =
  | "none"
  | "trialing"
  | "pending_payment"
  | "active"
  | "past_due"
  | "cancelled";

interface SubData {
  status: SubStatus;
  trialEndDate?: string;
  nextBillingDate?: string;
  lastBillingAt?: string;
  failCount?: number;
  planPrice?: number;
  daysUntilTrialEnd?: number;
  showPaymentNudge?: boolean;
  isLocked?: boolean;
  cardBrand?: string;
  cardLast4?: string;
}

interface PaymentRecord {
  id: number;
  amount: number;
  attemptedAt: string;
  paidAt: string | null;
  result: "success" | "fail";
  providerTxId: string;
  failReason: string | null;
}

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

// ──────────────────────────────────────────────────────────────────────────────
export default function Subscription() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [isRegisteringCard, setIsRegisteringCard] = useState(false);
  const [showDemoCardDialog, setShowDemoCardDialog] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const [receiptPayment, setReceiptPayment] = useState<PaymentRecord | null>(null);

  const isPortOneConfigured = !!(
    import.meta.env.VITE_PORTONE_STORE_ID &&
    import.meta.env.VITE_PORTONE_CHANNEL_KEY
  );

  const { data: sub, isLoading: isSubLoading } = useQuery<SubData>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
    select: (d: any) => d as SubData,
  });

  const { data: payments } = useQuery<PaymentRecord[]>({
    queryKey: ["/api/subscription/payments"],
    enabled: !!user && (sub?.status === "active" || sub?.status === "past_due"),
  });

  const startTrialMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/start-trial", {});
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({ title: "무료체험이 시작되었습니다!", description: "30일간 모든 기능을 무료로 이용하세요." });
    },
    onError: () =>
      toast({ title: "오류", description: "무료체험 시작에 실패했습니다.", variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/cancel", {});
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/subscription"] });
      setShowCancelModal(false);
      toast({ title: "구독이 해지되었습니다.", description: "다음 결제일부터 자동 갱신이 중단됩니다." });
    },
    onError: () =>
      toast({ title: "해지 실패", variant: "destructive" }),
  });

  const attachAndPay = async (billingKey: string) => {
    setIsRegisteringCard(true);
    try {
      const res = await apiRequest("POST", "/api/subscription/attach-card-and-pay", { billingKey });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "결제에 실패했습니다.");
      qc.invalidateQueries({ queryKey: ["/api/subscription"] });
      qc.invalidateQueries({ queryKey: ["/api/subscription/payments"] });
      toast({ title: "구독이 시작되었습니다! 🎉", description: "이제 모든 기능을 이용하실 수 있습니다." });
    } catch (err: any) {
      toast({ title: "결제 실패", description: err.message, variant: "destructive" });
    } finally {
      setIsRegisteringCard(false);
    }
  };

  const handleRegisterCard = async () => {
    if (!isPortOneConfigured) {
      setShowDemoCardDialog(true);
      return;
    }
    setIsRegisteringCard(true);
    try {
      const PortOne = (await import("@portone/browser-sdk/v2")).default;
      const storeId    = import.meta.env.VITE_PORTONE_STORE_ID;
      const channelKey = import.meta.env.VITE_PORTONE_CHANNEL_KEY;
      const response = await (PortOne as any).requestIssueBillingKey({
        storeId, channelKey,
        billingKeyMethod: "CARD",
        issueId: `issue-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        issueName: "펫그루머 서비스 카드 등록",
        customer: { id: String(user?.id) },
      });
      if (response?.code) {
        toast({ title: "카드 등록 실패", description: response.message || "카드 등록이 취소되었습니다.", variant: "destructive" });
        return;
      }
      await attachAndPay(response.billingKey);
    } catch (err: any) {
      toast({ title: "카드 등록 오류", description: err.message, variant: "destructive" });
    } finally {
      setIsRegisteringCard(false);
    }
  };

  // ── 로딩 / 인증 가드 ─────────────────────────────────────────────────────────
  if (isAuthLoading || isSubLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user || user.role !== "shop_owner") {
    setLocation("/login");
    return null;
  }

  // API가 none을 반환해도 shop 레벨 구독이 활성이면 해당 상태를 사용
  const shopStatus = (user as any)?.shop?.subscriptionStatus as string | undefined;
  const rawStatus = sub?.status ?? "none";
  const status: SubStatus =
    rawStatus === "none" && (shopStatus === "active" || shopStatus === "trialing")
      ? (shopStatus as SubStatus)
      : rawStatus;

  // ══════════════════════════════════════════════════════════════════════════════
  // 뷰 1: 구독 없음 — 무료체험 시작
  // ══════════════════════════════════════════════════════════════════════════════
  if (status === "none") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background py-12 px-4">
        <div className="max-w-lg mx-auto">
          <Button variant="ghost" size="sm" className="mb-6 gap-1.5 text-muted-foreground"
            onClick={() => setLocation("/admin/dashboard")}>
            <ArrowLeft className="w-4 h-4" /> 대시보드로
          </Button>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">30일 무료체험 시작하기</h1>
            <p className="text-muted-foreground text-sm">
              카드 등록 없이 바로 시작하세요. 체험 기간 동안 모든 기능을 무제한으로 이용할 수 있습니다.
            </p>
          </div>
          <div className="rounded-xl border border-primary/20 shadow-sm p-6 bg-card mb-4">
            <div className="text-center mb-5">
              <p className="text-sm text-muted-foreground mb-1">{PLAN.name} 플랜</p>
              <p className="text-4xl font-bold">{PLAN.price.toLocaleString()}<span className="text-xl font-normal text-muted-foreground">원/월</span></p>
            </div>
            <ul className="space-y-2.5 mb-6">
              {PLAN.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full" size="lg"
              onClick={() => startTrialMutation.mutate()}
              disabled={startTrialMutation.isPending}>
              {startTrialMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />시작하는 중...</>
                : "무료체험 시작하기 (30일, 카드 불필요)"}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              체험 종료 후 자동 결제되지 않습니다
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 공통 레이아웃 — 설정 페이지 스타일
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">구독 관리</h1>
        </div>

        {/* ─── 경고 배너들 ─────────────────────────────────────────────────── */}
        {sub?.showPaymentNudge && status === "trialing" && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-6">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
            <span>무료체험이 <strong>{sub.daysUntilTrialEnd}일 후</strong> 종료됩니다. 서비스를 계속 이용하려면 카드를 등록해주세요.</span>
          </div>
        )}
        {status === "pending_payment" && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-6">
            <Lock className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
            <span>무료체험이 종료되어 서비스가 제한됩니다. 카드를 등록하면 즉시 이용 가능합니다.</span>
          </div>
        )}
        {status === "past_due" && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-6">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
            <span>정기결제에 실패했습니다 ({sub?.failCount ?? 0}회). 카드를 다시 등록하면 즉시 결제 후 서비스가 정상화됩니다.</span>
          </div>
        )}

        {/* ─── 1. 플랜 섹션 ───────────────────────────────────────────────── */}
        <div className="flex items-start justify-between py-6 border-b">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <Scissors className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-base">{PLAN.name} 플랜</span>
                {status === "trialing" && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">
                    무료체험{sub?.daysUntilTrialEnd != null ? ` D-${Math.max(0, sub.daysUntilTrialEnd)}` : ""}
                  </Badge>
                )}
                {status === "active" && (
                  <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-xs">활성</Badge>
                )}
                {status === "past_due" && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">결제 실패</Badge>
                )}
                {status === "cancelled" && (
                  <Badge variant="secondary" className="text-xs">해지됨</Badge>
                )}
                {status === "pending_payment" && (
                  <Badge variant="outline" className="text-red-600 border-red-300 text-xs">결제 필요</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                월간 · {PLAN.price.toLocaleString()}원/월
              </p>
              {status === "active" && sub?.nextBillingDate && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  구독이 {fmtDate(sub.nextBillingDate)}에 자동으로 갱신됩니다
                </p>
              )}
              {status === "trialing" && sub?.trialEndDate && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  무료체험 종료일: {fmtDate(sub.trialEndDate)}
                </p>
              )}
              {status === "cancelled" && (
                <p className="text-sm text-muted-foreground mt-0.5">구독이 해지되었습니다.</p>
              )}
            </div>
          </div>
        </div>

        {/* ─── 2. 결제 수단 섹션 (active·past_due) ───────────────────────── */}
        {(status === "active" || status === "past_due") && (
          <div className="py-6 border-b">
            <h2 className="font-semibold mb-4">결제</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                {sub?.cardBrand && sub?.cardLast4
                  ? <span>{sub.cardBrand} ●●●● {sub.cardLast4}</span>
                  : <span className="text-muted-foreground">등록된 카드</span>
                }
              </div>
              <Button variant="outline" size="sm"
                onClick={handleRegisterCard}
                disabled={isRegisteringCard}>
                {isRegisteringCard
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />처리 중...</>
                  : status === "past_due" ? "카드 재등록" : "업데이트"
                }
              </Button>
            </div>
          </div>
        )}

        {/* ─── 카드 등록 CTA (trialing·pending_payment·cancelled) ────────── */}
        {(status === "trialing" || status === "pending_payment" || status === "cancelled") && (
          <div className="py-6 border-b">
            <h2 className="font-semibold mb-1">결제</h2>
            <p className="text-sm text-muted-foreground mb-4">
              카드를 등록하면 즉시 {PLAN.price.toLocaleString()}원이 결제되고 구독이 시작됩니다.
            </p>
            <Button
              onClick={handleRegisterCard}
              disabled={isRegisteringCard}
              variant={status === "pending_payment" ? "default" : "outline"}
            >
              {isRegisteringCard
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />처리 중...</>
                : <><CreditCard className="w-4 h-4 mr-2" />카드 등록하고 구독 시작</>
              }
            </Button>
          </div>
        )}

        {/* ─── 3. 청구서 섹션 (active·past_due) ──────────────────────────── */}
        {(status === "active" || status === "past_due") && (
          <div className="py-6 border-b">
            <h2 className="font-semibold mb-4">청구서</h2>
            {!payments || payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">결제 내역이 없습니다.</p>
            ) : (
              <div className="w-full">
                {/* 테이블 헤더 */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-8 text-xs text-muted-foreground pb-3 border-b">
                  <span>날짜</span>
                  <span>총계</span>
                  <span>상태</span>
                  <span>작업</span>
                </div>
                {/* 테이블 행 */}
                {payments.map((p) => (
                  <div key={p.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-8 items-center py-3 border-b last:border-0 text-sm">
                    <span>{fmtDate(p.attemptedAt)}</span>
                    <span className="font-medium">₩{p.amount.toLocaleString()}</span>
                    <span>
                      {p.result === "success" ? (
                        <span className="text-green-600 font-medium">결제됨</span>
                      ) : (
                        <span className="text-red-500 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" />실패
                        </span>
                      )}
                    </span>
                    <span>
                      {p.result === "success" && p.providerTxId ? (
                        <button
                          className="text-primary text-sm underline underline-offset-2 hover:opacity-70 transition-opacity"
                          onClick={() => setReceiptPayment(p)}
                        >
                          보기
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── 4. 취소 섹션 (active만) ────────────────────────────────────── */}
        {status === "active" && (
          <div className="py-6">
            <h2 className="font-semibold mb-1">취소</h2>
            <p className="text-sm text-muted-foreground mb-4">
              구독을 취소하면 다음 결제일부터 자동 갱신이 중단됩니다.
              {sub?.nextBillingDate && ` (다음 결제일: ${fmtDate(sub.nextBillingDate)})`}
            </p>
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
              onClick={() => setShowCancelModal(true)}
            >
              구독 취소
            </Button>
          </div>
        )}

      </div>

      {/* ── 데모 카드 등록 다이얼로그 ─────────────────────────────────────────── */}
      <Dialog open={showDemoCardDialog} onOpenChange={setShowDemoCardDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              데모 카드 등록 모드
            </DialogTitle>
            <DialogDescription>
              PG사(포트원) 연동 전입니다. 실제 카드 등록 없이 즉시 구독이 활성화됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-secondary/30 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">플랜</span>
              <span className="font-medium">{PLAN.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">결제 금액</span>
              <span className="font-bold text-primary">{PLAN.price.toLocaleString()}원</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDemoCardDialog(false)} disabled={isRegisteringCard}>취소</Button>
            <Button
              onClick={async () => {
                setShowDemoCardDialog(false);
                await attachAndPay("demo_billing_key_" + Date.now());
              }}
              disabled={isRegisteringCard}
            >
              {isRegisteringCard
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />처리 중...</>
                : <><CreditCard className="w-4 h-4 mr-2" />구독 시작 (데모)</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 구독 해지 모달 ─────────────────────────────────────────────────── */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>구독 취소</DialogTitle>
            <DialogDescription>
              취소 사유를 선택해주세요. 다음 결제일부터 자동 갱신이 중단됩니다.
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
              <Label className="text-sm font-medium">추가 의견 (선택)</Label>
              <Textarea
                placeholder="의견을 입력해주세요"
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
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              구독 취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 결제 상세 팝업 */}
      <Dialog open={!!receiptPayment} onOpenChange={(v) => { if (!v) setReceiptPayment(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>결제 상세</DialogTitle>
          </DialogHeader>
          {receiptPayment && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">결제일</span>
                <span className="font-medium">{fmtDate(receiptPayment.paidAt ?? receiptPayment.attemptedAt)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">플랜</span>
                <span className="font-medium">스탠다드 (월간)</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">결제 금액</span>
                <span className="font-medium">₩{receiptPayment.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">상태</span>
                <span className="text-green-600 font-medium">결제됨</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">거래 ID</span>
                <span className="font-mono text-xs break-all text-right max-w-[180px]">{receiptPayment.providerTxId}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setReceiptPayment(null)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
