/**
 * PlatformAdmin.tsx — 슈퍼관리자 플랫폼 대시보드 (/admin/platform)
 *
 * 역할: KPI 요약 + 최근 등록 가맹점 미리보기
 * 전체 가맹점 목록·검색·편집은 /admin/shops (ShopsAdmin.tsx)에서 관리한다.
 *
 * [변경 이력]
 * - 가맹점 관리 박스(탭·검색·스크롤 목록)를 ShopsAdmin.tsx 로 분리
 * - 이 페이지는 KPI 카드 + 최근 등록 5개 미리보기 + "전체 가맹점 관리" 이동 버튼만 표시
 * - 승인 관련 UI 없음
 */

import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Loader2, Store, Calendar, LogOut, Settings, ChevronRight,
  ArrowRight, Users, TrendingUp, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import type { Shop } from "@shared/schema";

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────
type ShopWithOwner = Shop & { ownerEmail: string | null };

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────────────
function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const dt = new Date(d);
  const y  = dt.getFullYear();
  const m  = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 단순 활성/비활성 배지 */
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

// ─────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
export default function PlatformAdmin() {
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const [_, setLocation] = useLocation();

  // 가맹점 목록 조회 (요약에만 사용)
  const { data: shops, isLoading } = useQuery<ShopWithOwner[]>({
    queryKey: ["/api/admin/shops"],
    enabled: !!user && user.role === "super_admin",
    refetchOnWindowFocus: true,
  });

  // 인증 가드
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

  // 파생 데이터
  const allShops     = shops ?? [];
  const activeShops  = allShops.filter(s => s.subscriptionStatus === "active");
  const inactiveShops = allShops.filter(s => s.subscriptionStatus !== "active");
  // 최근 등록 5개 (getShops API는 createdAt DESC 순으로 반환)
  const recentShops  = allShops.slice(0, 5);

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
              <p className="text-sm text-muted-foreground">총 관리자 대시보드</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => logout()} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* ── KPI 카드 ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">전체 가맹점</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="text-3xl font-bold">{isLoading ? "—" : allShops.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">활성 가맹점</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="text-3xl font-bold text-green-600">
                {isLoading ? "—" : activeShops.length}
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">비활성 가맹점</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="text-3xl font-bold text-muted-foreground">
                {isLoading ? "—" : inactiveShops.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── 최근 등록 가맹점 미리보기 ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-base">최근 등록 가맹점</h2>
              <span className="text-sm text-muted-foreground">(최근 5개)</span>
            </div>
            {/* 전체 가맹점 관리 페이지로 이동 */}
            <Button
              variant="outline" size="sm"
              onClick={() => setLocation("/admin/shops")}
              className="gap-1.5"
              data-testid="button-go-shops-admin"
            >
              전체 가맹점 관리
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* 최근 5개 가맹점 목록 */}
          <div className="divide-y">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : recentShops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Store className="w-10 h-10 opacity-30" />
                <p className="text-sm">등록된 가맹점이 없습니다</p>
              </div>
            ) : (
              recentShops.map(shop => (
                /*
                 * 미리보기 행 — 클릭 시 /admin/shops 로 이동
                 * (전체 목록에서 해당 가맹점 검색/확인)
                 */
                <button
                  key={shop.id}
                  className="w-full text-left px-5 py-4 hover:bg-secondary/30 transition-colors flex items-center justify-between group"
                  onClick={() => setLocation("/admin/shops")}
                  data-testid={`preview-shop-${shop.id}`}
                >
                  {/* 왼쪽: 가맹점명 + 상태배지 / 로그인 아이디 */}
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
                  {/* 오른쪽: 가입일 */}
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

          {/* 하단 "전체 보기" 버튼 */}
          {allShops.length > 5 && (
            <div className="px-5 py-3 border-t bg-secondary/10">
              <Button
                variant="ghost" size="sm"
                onClick={() => setLocation("/admin/shops")}
                className="w-full gap-2 text-primary hover:text-primary"
              >
                <Store className="w-4 h-4" />
                전체 {allShops.length}개 가맹점 모두 보기
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
