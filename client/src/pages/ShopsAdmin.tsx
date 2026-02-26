/**
 * ShopsAdmin.tsx — 가맹점 관리 전용 페이지 (/admin/shops)
 *
 * 기능:
 * - 탭: 전체 가맹점 / 활성 가맹점 / 비활성 가맹점
 * - 검색: 가맹점명·전화번호·고유아이디(slug) 기준
 * - 클라이언트 페이지네이션: 페이지당 10개
 * - 가맹점 행 클릭 → 상세 모달 (로그인 아이디·가입일·구독정보 등)
 * - 상세 모달 내 편집·삭제 버튼
 * - PlatformAdmin(/admin/platform)으로 돌아가기 버튼
 *
 * [1] 로그인 아이디 표시
 *   - 상세 모달 "로그인 아이디" 항목에 ownerEmail 표시 (ownerEmail은 API에서 JOIN해 반환)
 *   - 데이터 없을 경우 "(알 수 없음)" fallback
 *   - shop.id(DB 내부 숫자 일련번호)는 UI에 노출하지 않음
 *
 * [2] 가맹점 관리 전용 페이지
 *   - PlatformAdmin에서 "전체 가맹점 관리" 버튼 클릭 시 이동
 *   - 목록이 길어져도 페이지네이션으로 탐색 가능
 */

import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Loader2, Store, LogOut, Settings, Pencil, Trash2,
  CreditCard, Search, RefreshCw, ChevronRight, Building2,
  Phone, Clock, ArrowLeft, ChevronLeft, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
// 타입
// ─────────────────────────────────────────────────────────────────────────────

/**
 * /api/admin/shops 응답 타입
 * ownerEmail: users 테이블을 JOIN해서 가져온 소유자 로그인 이메일
 *             이것이 UI에서 "로그인 아이디"로 표시된다.
 *
 * ※ shop.id(DB 내부 숫자 일련번호)는 사용자에게 노출하지 않는다.
 */
type ShopWithOwner = Shop & { ownerEmail: string | null };

type ShopFilter = "all" | "active" | "inactive";

const ITEMS_PER_PAGE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

/** 행에 표시할 단순 활성/비활성 배지 */
function StatusBadge({ status }: { status: string | null }) {
  if (status === "active") {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-xs">
        활성
      </Badge>
    );
  }
  return <Badge variant="secondary" className="text-xs">비활성</Badge>;
}

/** 상세 패널의 구체적인 구독 상태 배지 */
function SubDetailBadge({ status }: { status: string | null }) {
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

function tierLabel(tier: string | null | undefined): string {
  switch (tier) {
    case "basic":      return "베이직";
    case "premium":    return "프리미엄";
    case "enterprise": return "엔터프라이즈";
    default:           return "-";
  }
}

/** 날짜를 YYYY-MM-DD 형식으로 반환 */
function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const dt = new Date(d);
  const y  = dt.getFullYear();
  const m  = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
export default function ShopsAdmin() {
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── 탭·검색·페이지 상태 ───────────────────────────────────────────────────
  const [filter, setFilter]     = useState<ShopFilter>("all");
  const [search, setSearch]     = useState("");
  const [currentPage, setPage]  = useState(1);

  // ── 모달 상태 ─────────────────────────────────────────────────────────────
  const [detailShop,  setDetailShop]  = useState<ShopWithOwner | null>(null);
  const [editingShop, setEditingShop] = useState<ShopWithOwner | null>(null);
  const [deletingShop,setDeletingShop]= useState<ShopWithOwner | null>(null);

  const [editForm, setEditForm] = useState({
    name: "", phone: "", address: "", businessHours: "",
    depositAmount: 0, depositRequired: true,
    subscriptionStatus: "none", subscriptionTier: "basic",
    subscriptionEnd: "", password: "",
  });

  // ── 가맹점 목록 조회 ──────────────────────────────────────────────────────
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
    onError: (e: Error) =>
      toast({ title: "수정 실패", description: e.message, variant: "destructive" }),
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
    onError: (e: Error) =>
      toast({ title: "삭제 실패", description: e.message, variant: "destructive" }),
  });

  const openEditModal = (shop: ShopWithOwner) => {
    setEditForm({
      name:               shop.name,
      phone:              shop.phone,
      address:            shop.address,
      businessHours:      shop.businessHours,
      depositAmount:      shop.depositAmount,
      depositRequired:    shop.depositRequired,
      subscriptionStatus: shop.subscriptionStatus || "none",
      subscriptionTier:   shop.subscriptionTier   || "basic",
      subscriptionEnd:    shop.subscriptionEnd
        ? new Date(shop.subscriptionEnd).toISOString().split("T")[0] : "",
      password: "",
    });
    setEditingShop(shop);
    setDetailShop(null);
  };

  // ── 인증 가드 ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthLoading && (!user || user.role !== "super_admin")) setLocation("/login");
  }, [isAuthLoading, user, setLocation]);

  if (isAuthLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user || user.role !== "super_admin") return null;

  // ── 파생 데이터 ────────────────────────────────────────────────────────────
  const allShops     = shops ?? [];
  const activeShops  = allShops.filter(s => s.subscriptionStatus === "active");
  const inactiveShops = allShops.filter(s => s.subscriptionStatus !== "active");

  const baseList: ShopWithOwner[] =
    filter === "active"   ? activeShops   :
    filter === "inactive" ? inactiveShops : allShops;

  // 검색 필터 — 가맹점명·전화번호·고유아이디(slug) 기준
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseList;
    return baseList.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.slug.toLowerCase().includes(q)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allShops, filter, search]);

  // 탭·검색 변경 시 첫 페이지로 초기화
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { setPage(1); }, [filter, search]);

  // 페이지네이션
  const totalPages  = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated   = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── 탭 정의 ──────────────────────────────────────────────────────────────
  const TABS: { key: ShopFilter; label: string; count: number }[] = [
    { key: "all",      label: "전체 가맹점",  count: allShops.length },
    { key: "active",   label: "활성 가맹점",  count: activeShops.length },
    { key: "inactive", label: "비활성 가맹점", count: inactiveShops.length },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-secondary/30">

      {/* ── 헤더 ── */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* 플랫폼 관리 대시보드로 돌아가기 */}
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setLocation("/admin/platform")}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">돌아가기</span>
            </Button>
            <div className="w-px h-6 bg-border" />
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">가맹점 관리</h1>
              <p className="text-sm text-muted-foreground">전체 가맹점 목록 · 검색 · 편집</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => logout()}>
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* ══════════════════════════════════════════════════════════════
            가맹점 관리 박스
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

          {/* 박스 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-base">가맹점 목록</h2>
              <span className="text-sm text-muted-foreground">
                ({filtered.length}개 / 전체 {allShops.length}개)
              </span>
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
                  "flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  filter === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {t.label}
                <span className={[
                  "text-xs rounded-full px-1.5 py-0.5 font-semibold",
                  filter === t.key
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary text-muted-foreground",
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
                placeholder="가맹점명, 전화번호, 고유아이디(shopId) 검색..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
          </div>

          {/* ── 목록 ── */}
          <div className="divide-y">
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
              paginated.map(shop => (
                /*
                 * 가맹점 행
                 * 왼쪽: 가맹점명 + 상태배지 / 로그인아이디(ownerEmail, 회색)
                 * 오른쪽: 가입일 + 화살표
                 */
                <button
                  key={shop.id}
                  className="w-full text-left px-5 py-4 hover:bg-secondary/30 transition-colors flex items-center justify-between group"
                  onClick={() => setDetailShop(shop)}
                  data-testid={`row-shop-${shop.id}`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{shop.name}</span>
                      <StatusBadge status={shop.subscriptionStatus} />
                    </div>
                    {/* ownerEmail: 소유자 로그인 아이디 */}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3 flex-shrink-0" />
                      {shop.ownerEmail ?? "(알 수 없음)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {fmtDate(shop.createdAt)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* ── 페이지네이션 ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t bg-secondary/10">
              <span className="text-xs text-muted-foreground">
                {currentPage} / {totalPages} 페이지 ({filtered.length}개)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {/* 페이지 번호 버튼 (최대 5개) */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // 현재 페이지를 가운데에 두는 윈도우 계산
                  let start = Math.max(1, currentPage - 2);
                  const end   = Math.min(totalPages, start + 4);
                  start = Math.max(1, end - 4);
                  const page  = start + i;
                  if (page > totalPages) return null;
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0 text-xs"
                      onClick={() => setPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
                <Button
                  variant="outline" size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          가맹점 상세 모달
          ─ "로그인 아이디" = ownerEmail (users 테이블 JOIN)
          ─ shop.slug 는 "예약 URL 식별자"로 별도 표시
          ─ shop.id (DB 숫자 일련번호)는 노출하지 않음
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!detailShop} onOpenChange={open => !open && setDetailShop(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-primary" />
              {detailShop?.name}
            </DialogTitle>
            <DialogDescription>가맹점 상세 정보</DialogDescription>
          </DialogHeader>

          {detailShop && (
            <div className="space-y-4 py-2">

              {/* ── 기본 정보 ── */}
              <section className="rounded-xl border p-4 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  기본 정보
                </h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">

                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">가맹점명</p>
                    <p className="font-semibold">{detailShop.name}</p>
                  </div>

                  {/*
                   * [1] 로그인 아이디 표시
                   * ownerEmail: users.email 을 JOIN 해서 가져온 값
                   * shop.id(숫자) 대신 실제 로그인 아이디를 메인으로 표시한다.
                   * 데이터가 없으면 "(알 수 없음)" fallback 처리.
                   */}
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">로그인 아이디</p>
                    <p className="font-medium flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      {detailShop.ownerEmail ?? "(알 수 없음)"}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">가입일</p>
                    <p className="font-medium">{fmtDate(detailShop.createdAt)}</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-xs mb-1">상태</p>
                    <StatusBadge status={detailShop.subscriptionStatus} />
                  </div>

                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">전화번호</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      {detailShop.phone}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">영업시간</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {detailShop.businessHours}
                    </p>
                  </div>

                  <div className="col-span-2">
                    {/* slug: 예약 페이지 URL에 사용하는 가맹점 식별자 (내부용) */}
                    <p className="text-muted-foreground text-xs mb-0.5">예약 URL 식별자</p>
                    <p className="font-mono text-xs text-muted-foreground">{detailShop.slug}</p>
                  </div>

                </div>
              </section>

              {/* ── 구독 정보 ── */}
              <section className="rounded-xl border p-4 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  구독 정보
                </h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">구독 상태</p>
                    <SubDetailBadge status={detailShop.subscriptionStatus} />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">플랜</p>
                    <p className="font-medium">{tierLabel(detailShop.subscriptionTier)}</p>
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

      {/* ══════════════════════════════════════════════════════════════════════
          가맹점 편집 모달
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!editingShop} onOpenChange={open => !open && setEditingShop(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>가맹점 정보 수정</DialogTitle>
            <DialogDescription>{editingShop?.name}의 정보를 수정합니다.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sa-name">가맹점 이름</Label>
              <Input id="sa-name" value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sa-phone">전화번호</Label>
              <Input id="sa-phone" value={editForm.phone}
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sa-address">주소</Label>
              <Input id="sa-address" value={editForm.address}
                onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sa-hours">영업시간</Label>
              <Input id="sa-hours" value={editForm.businessHours}
                placeholder="예: 09:00-18:00"
                onChange={e => setEditForm({ ...editForm, businessHours: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sa-deposit">예약금</Label>
              <Input id="sa-deposit" type="number" value={editForm.depositAmount}
                onChange={e => setEditForm({ ...editForm, depositAmount: Number(e.target.value) })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sa-deposit-req">예약금 필수</Label>
              <Switch id="sa-deposit-req" checked={editForm.depositRequired}
                onCheckedChange={v => setEditForm({ ...editForm, depositRequired: v })} />
            </div>

            <div className="border-t pt-4 space-y-2">
              <Label htmlFor="sa-pw">비밀번호 변경 (선택사항)</Label>
              <Input id="sa-pw" type="password"
                placeholder="새 비밀번호 입력 (비워두면 유지)"
                value={editForm.password}
                onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
              <p className="text-xs text-muted-foreground">비워두면 기존 비밀번호가 유지됩니다.</p>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4" />구독 관리
              </h4>
              <div className="grid gap-2">
                <Label htmlFor="sa-sub-status">구독 상태</Label>
                <select id="sa-sub-status"
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
                <Label htmlFor="sa-sub-tier">구독 플랜</Label>
                <select id="sa-sub-tier"
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
                <Label htmlFor="sa-sub-end">구독 만료일</Label>
                <Input id="sa-sub-end" type="date" value={editForm.subscriptionEnd}
                  onChange={e => setEditForm({ ...editForm, subscriptionEnd: e.target.value })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingShop(null)}>취소</Button>
            <Button
              onClick={() =>
                editingShop && editMutation.mutate({ shopId: editingShop.id, data: editForm })}
              disabled={editMutation.isPending}
            >
              {editMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          삭제 확인 다이얼로그
      ══════════════════════════════════════════════════════════════════════ */}
      <AlertDialog open={!!deletingShop} onOpenChange={open => !open && setDeletingShop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>가맹점 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-red-600">{deletingShop?.name}</span>을(를) 정말
              삭제하시겠습니까?<br /><br />
              이 작업은 되돌릴 수 없으며, 해당 가맹점의 모든 데이터(예약·고객·서비스·계정)가
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
