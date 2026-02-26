import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Loader2, Store, Calendar, LogOut, Settings, Pencil, Trash2,
  CreditCard, Search, RefreshCw, ChevronRight, User, MapPin,
  Phone, Clock, Building2, BadgeCheck, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useMemo, useEffect } from "react";
import type { Shop } from "@shared/schema";

// ─────────────────────────────────────────────────────────────────────────────
// 타입: /api/admin/shops 응답 (ownerEmail 포함)
// ─────────────────────────────────────────────────────────────────────────────
type ShopWithOwner = Shop & { ownerEmail: string | null };

type ShopFilter = "all" | "active" | "inactive";

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼: 구독 상태 배지
// ─────────────────────────────────────────────────────────────────────────────
function SubBadge({ status }: { status: string | null }) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">활성</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="text-orange-600 border-orange-300">취소</Badge>;
    case "expired":
      return <Badge variant="outline" className="text-red-500 border-red-200">만료</Badge>;
    default:
      return <Badge variant="secondary">미구독</Badge>;
  }
}

function TierLabel({ tier }: { tier: string | null | undefined }) {
  switch (tier) {
    case "basic":      return "베이직";
    case "premium":    return "프리미엄";
    case "enterprise": return "엔터프라이즈";
    default:           return "-";
  }
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function PlatformAdmin() {
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── 필터/검색 상태 ─────────────────────────────────────────────────────────
  const [filter, setFilter]       = useState<ShopFilter>("all");
  const [searchQuery, setSearch]  = useState("");

  // ── 선택된 가맹점 (상세 모달) ────────────────────────────────────────────
  const [detailShop, setDetailShop]   = useState<ShopWithOwner | null>(null);

  // ── 편집/삭제 모달 ──────────────────────────────────────────────────────
  const [editingShop,  setEditingShop]  = useState<ShopWithOwner | null>(null);
  const [deletingShop, setDeletingShop] = useState<ShopWithOwner | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", phone: "", address: "", businessHours: "",
    depositAmount: 0, depositRequired: true,
    subscriptionStatus: "none", subscriptionTier: "basic",
    subscriptionEnd: "", password: "",
  });

  // ── API ─────────────────────────────────────────────────────────────────
  const { data: shops, isLoading, refetch, isFetching } = useQuery<ShopWithOwner[]>({
    queryKey: ["/api/admin/shops"],
    enabled: !!user && user.role === "super_admin",
    refetchOnWindowFocus: true,
  });

  // ── Mutation: 편집 ────────────────────────────────────────────────────────
  const editMutation = useMutation({
    mutationFn: async ({ shopId, data }: { shopId: number; data: typeof editForm }) => {
      const res = await apiRequest("PATCH", `/api/admin/shops/${shopId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shops"] });
      toast({ title: "수정 완료", description: "가맹점 정보가 수정되었습니다." });
      setEditingShop(null);
      setDetailShop(null);
    },
    onError: (e: Error) => toast({ title: "수정 실패", description: e.message, variant: "destructive" }),
  });

  // ── Mutation: 삭제 ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (shopId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/shops/${shopId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shops"] });
      toast({ title: "삭제 완료", description: "가맹점이 삭제되었습니다." });
      setDeletingShop(null);
      setDetailShop(null);
    },
    onError: (e: Error) => toast({ title: "삭제 실패", description: e.message, variant: "destructive" }),
  });

  const openEditModal = (shop: ShopWithOwner) => {
    setEditForm({
      name: shop.name,
      phone: shop.phone,
      address: shop.address,
      businessHours: shop.businessHours,
      depositAmount: shop.depositAmount,
      depositRequired: shop.depositRequired,
      subscriptionStatus: shop.subscriptionStatus || "none",
      subscriptionTier: shop.subscriptionTier || "basic",
      subscriptionEnd: shop.subscriptionEnd
        ? new Date(shop.subscriptionEnd).toISOString().split("T")[0] : "",
      password: "",
    });
    setEditingShop(shop);
    setDetailShop(null);
  };

  // ── 인증 가드 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthLoading && (!user || user.role !== "super_admin")) setLocation("/login");
  }, [isAuthLoading, user, setLocation]);

  if (isAuthLoading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  if (!user || user.role !== "super_admin") return null;

  // ── 파생 데이터 ────────────────────────────────────────────────────────────
  const allShops     = shops ?? [];
  const activeShops  = allShops.filter(s => s.subscriptionStatus === "active");
  const inactiveShops = allShops.filter(s => s.subscriptionStatus !== "active");

  // 현재 탭 기준 목록
  const baseList: ShopWithOwner[] =
    filter === "active"   ? activeShops  :
    filter === "inactive" ? inactiveShops : allShops;

  // 검색 필터
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return baseList;
    return baseList.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.address.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      (s.ownerEmail ?? "").toLowerCase().includes(q)
    );
  }, [baseList, searchQuery]);

  // ── 탭 정의 ────────────────────────────────────────────────────────────────
  const TABS: { key: ShopFilter; label: string; count: number }[] = [
    { key: "all",      label: "전체 가맹점",  count: allShops.length },
    { key: "active",   label: "활성",         count: activeShops.length },
    { key: "inactive", label: "미활성/신규",  count: inactiveShops.length },
  ];

  return (
    <div className="min-h-screen bg-secondary/30">

      {/* ── 헤더 ── */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">정리하개 플랫폼 관리</h1>
              <p className="text-sm text-muted-foreground">총 관리자</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => logout()}>
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* ── KPI 카드 ── */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">전체 가맹점</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="text-3xl font-bold">{allShops.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">활성 구독</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="text-3xl font-bold text-green-600">{activeShops.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* ── 가맹점 관리 박스 ────────────────────────────────────────────────
             - 탭: 전체 / 활성 / 미활성
             - 검색
             - 스크롤 가능한 목록
        ──────────────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

          {/* 박스 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-base">가맹점 관리</h2>
              <span className="text-sm text-muted-foreground">({filtered.length}개)</span>
            </div>
            <Button
              variant="ghost" size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-muted-foreground gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              새로고침
            </Button>
          </div>

          {/* 탭 */}
          <div className="flex border-b px-5 gap-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => { setFilter(t.key); setSearch(""); }}
                className={[
                  "flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors",
                  filter === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {t.label}
                <span className={[
                  "text-xs rounded-full px-1.5 py-0.5 font-semibold",
                  filter === t.key ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground",
                ].join(" ")}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* 검색 */}
          <div className="px-5 py-3 border-b bg-secondary/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="가맹점명, 전화번호, 주소, 아이디(이메일), 슬러그 검색..."
                value={searchQuery}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
          </div>

          {/* 목록 */}
          <div className="overflow-y-auto max-h-[560px] divide-y">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <Store className="w-10 h-10 opacity-30" />
                <p className="text-sm">해당하는 가맹점이 없습니다</p>
              </div>
            ) : (
              filtered.map(shop => (
                /* 가맹점 행 — 클릭하면 상세 모달 */
                <button
                  key={shop.id}
                  className="w-full text-left px-5 py-4 hover:bg-secondary/30 transition-colors flex items-center gap-4 group"
                  onClick={() => setDetailShop(shop)}
                  data-testid={`row-shop-${shop.id}`}
                >
                  {/* 아이콘 */}
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>

                  {/* 메인 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm truncate">{shop.name}</span>
                      <SubBadge status={shop.subscriptionStatus} />
                      {shop.subscriptionTier && shop.subscriptionStatus === "active" && (
                        <span className="text-xs text-muted-foreground">
                          ({TierLabel({ tier: shop.subscriptionTier })})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {/* 로그인 아이디(이메일) */}
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {shop.ownerEmail ?? "-"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {shop.phone}
                      </span>
                    </div>
                  </div>

                  {/* 가입일 */}
                  <div className="text-xs text-muted-foreground hidden sm:block flex-shrink-0">
                    {fmtDate(shop.createdAt)}
                  </div>

                  {/* 화살표 */}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────────────
          가맹점 상세 모달
          클릭한 가맹점의 모든 정보 + 편집/삭제 버튼
      ───────────────────────────────────────────────────────────────────── */}
      <Dialog open={!!detailShop} onOpenChange={open => !open && setDetailShop(null)}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-primary" />
              {detailShop?.name}
            </DialogTitle>
            <DialogDescription>
              가맹점 상세 정보
            </DialogDescription>
          </DialogHeader>

          {detailShop && (
            <div className="space-y-4 py-2">
              {/* ── 기본 정보 ── */}
              <section className="rounded-xl border p-4 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">기본 정보</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">로그인 아이디</p>
                    <p className="font-medium flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      {detailShop.ownerEmail ?? "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">슬러그 (URL)</p>
                    <p className="font-medium font-mono text-xs">{detailShop.slug}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">전화번호</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      {detailShop.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">가입일</p>
                    <p className="font-medium">{fmtDate(detailShop.createdAt)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs mb-0.5">주소</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      {detailShop.address}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">영업시간</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {detailShop.businessHours}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">예약금</p>
                    <p className="font-medium">
                      {detailShop.depositRequired
                        ? `${detailShop.depositAmount.toLocaleString()}원`
                        : "미사용"}
                    </p>
                  </div>
                </div>
              </section>

              {/* ── 구독 정보 ── */}
              <section className="rounded-xl border p-4 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  구독 정보
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">상태</p>
                    <SubBadge status={detailShop.subscriptionStatus} />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">플랜</p>
                    <p className="font-medium">{TierLabel({ tier: detailShop.subscriptionTier })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">구독 시작</p>
                    <p className="font-medium">{fmtDate(detailShop.subscriptionStart)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">구독 만료</p>
                    <p className="font-medium">{fmtDate(detailShop.subscriptionEnd)}</p>
                  </div>
                </div>
              </section>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive" size="sm"
              onClick={() => { setDeletingShop(detailShop); setDetailShop(null); }}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              삭제
            </Button>
            <Button
              size="sm"
              onClick={() => detailShop && openEditModal(detailShop)}
            >
              <Pencil className="w-4 h-4 mr-1.5" />
              편집
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────────────
          가맹점 편집 모달
      ───────────────────────────────────────────────────────────────────── */}
      <Dialog open={!!editingShop} onOpenChange={open => !open && setEditingShop(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>가맹점 정보 수정</DialogTitle>
            <DialogDescription>{editingShop?.name}의 정보를 수정합니다.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">가맹점 이름</Label>
              <Input id="edit-name" value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">전화번호</Label>
              <Input id="edit-phone" value={editForm.phone}
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">주소</Label>
              <Input id="edit-address" value={editForm.address}
                onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-hours">영업시간</Label>
              <Input id="edit-hours" value={editForm.businessHours}
                placeholder="예: 09:00-18:00"
                onChange={e => setEditForm({ ...editForm, businessHours: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-deposit">예약금</Label>
              <Input id="edit-deposit" type="number" value={editForm.depositAmount}
                onChange={e => setEditForm({ ...editForm, depositAmount: Number(e.target.value) })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-deposit-req">예약금 필수</Label>
              <Switch id="edit-deposit-req" checked={editForm.depositRequired}
                onCheckedChange={v => setEditForm({ ...editForm, depositRequired: v })} />
            </div>

            {/* 비밀번호 변경 */}
            <div className="border-t pt-4 space-y-2">
              <Label htmlFor="edit-pw">비밀번호 변경 (선택사항)</Label>
              <Input id="edit-pw" type="password"
                placeholder="새 비밀번호 입력 (비워두면 유지)"
                value={editForm.password}
                onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
              <p className="text-xs text-muted-foreground">비워두면 기존 비밀번호가 유지됩니다.</p>
            </div>

            {/* 구독 관리 */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4" />구독 관리
              </h4>
              <div className="grid gap-2">
                <Label htmlFor="edit-sub-status">구독 상태</Label>
                <select id="edit-sub-status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editForm.subscriptionStatus}
                  onChange={e => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
                >
                  <option value="none">미구독</option>
                  <option value="active">활성</option>
                  <option value="expired">만료</option>
                  <option value="cancelled">취소</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sub-tier">구독 플랜</Label>
                <select id="edit-sub-tier"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editForm.subscriptionTier}
                  onChange={e => setEditForm({ ...editForm, subscriptionTier: e.target.value })}
                >
                  <option value="basic">베이직 (29,000원/월)</option>
                  <option value="premium">프리미엄 (49,000원/월)</option>
                  <option value="enterprise">엔터프라이즈 (99,000원/월)</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sub-end">구독 만료일</Label>
                <Input id="edit-sub-end" type="date" value={editForm.subscriptionEnd}
                  onChange={e => setEditForm({ ...editForm, subscriptionEnd: e.target.value })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingShop(null)}>취소</Button>
            <Button
              onClick={() => editingShop && editMutation.mutate({ shopId: editingShop.id, data: editForm })}
              disabled={editMutation.isPending}
            >
              {editMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────────────
          가맹점 삭제 확인 다이얼로그
      ───────────────────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deletingShop} onOpenChange={open => !open && setDeletingShop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>가맹점 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-red-600">{deletingShop?.name}</span>을(를) 정말
              삭제하시겠습니까?<br /><br />
              이 작업은 되돌릴 수 없으며, 해당 가맹점의 모든 데이터(예약, 고객, 서비스, 계정)가
              함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletingShop && deleteMutation.mutate(deletingShop.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
