import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
// useQuery 제거: 승인 대기 수 조회 API(/api/admin/pending-users/count) 사용 안 함
import { Scissors, User, LogOut, LayoutDashboard, Users, CalendarDays, Settings, Shield, TrendingUp } from "lucide-react";
// Bell·Badge 제거: 승인 관리 아이콘·배지 사용 안 함
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  // 예약 페이지에서는 로그인 버튼 숨김
  const isBookingPage = location.startsWith('/book/');

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="bg-primary/20 p-2 rounded-full group-hover:bg-primary/30 transition-colors">
            <Scissors className="h-6 w-6 text-primary group-hover:rotate-12 transition-transform" />
          </div>
          <span className="text-xl font-bold text-foreground">정리하개</span>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-1">
              {/* 슈퍼 어드민 메뉴 — "플랫폼 관리"만 표시 (승인 관리 메뉴 제거) */}
              {user.role === 'super_admin' && (
                <Link href="/admin/platform">
                  <button className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-full font-medium transition-all",
                    location === "/admin/platform"
                      ? "bg-secondary text-secondary-foreground"
                      : "text-foreground/70 hover:bg-secondary/30"
                  )} data-testid="link-platform">
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">플랫폼 관리</span>
                  </button>
                </Link>
              )}

              {/* Shop Owner 메뉴 - 데스크탑만 표시 (모바일은 하단 네비게이션) */}
              {user.role === 'shop_owner' && (
                <div className="hidden lg:flex items-center gap-1">
                  <Link href="/admin/dashboard">
                    <button className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full font-medium transition-all",
                      location === "/admin/dashboard"
                        ? "bg-secondary text-secondary-foreground"
                        : "text-foreground/70 hover:bg-secondary/30"
                    )} data-testid="link-dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>대시보드</span>
                    </button>
                  </Link>
                  <Link href="/admin/customers">
                    <button className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full font-medium transition-all",
                      location === "/admin/customers"
                        ? "bg-secondary text-secondary-foreground"
                        : "text-foreground/70 hover:bg-secondary/30"
                    )} data-testid="link-customers">
                      <Users className="h-4 w-4" />
                      <span>고객</span>
                    </button>
                  </Link>
                  <Link href="/admin/calendar">
                    <button className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full font-medium transition-all",
                      location === "/admin/calendar"
                        ? "bg-secondary text-secondary-foreground"
                        : "text-foreground/70 hover:bg-secondary/30"
                    )} data-testid="link-calendar">
                      <CalendarDays className="h-4 w-4" />
                      <span>캘린더</span>
                    </button>
                  </Link>
                  <Link href="/admin/revenue">
                    <button className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full font-medium transition-all",
                      location === "/admin/revenue"
                        ? "bg-secondary text-secondary-foreground"
                        : "text-foreground/70 hover:bg-secondary/30"
                    )} data-testid="link-revenue">
                      <TrendingUp className="h-4 w-4" />
                      <span>매출</span>
                    </button>
                  </Link>
                  <Link href="/admin/settings">
                    <button className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full font-medium transition-all",
                      location === "/admin/settings"
                        ? "bg-secondary text-secondary-foreground"
                        : "text-foreground/70 hover:bg-secondary/30"
                    )} data-testid="link-settings">
                      <Settings className="h-4 w-4" />
                      <span>설정</span>
                    </button>
                  </Link>
                </div>
              )}

              {/* 로그아웃 버튼 */}
              <button
                onClick={() => logout()}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                title="로그아웃"
                data-testid="button-logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            // 예약 페이지에서는 로그인 버튼 숨김
            !isBookingPage && (
              <div className="flex items-center gap-2">
                <Link href="/book/gangnam">
                  <button className={cn(
                    "hidden sm:flex items-center px-4 py-2 rounded-full font-medium transition-all",
                    location === "/book/gangnam"
                      ? "bg-primary text-white shadow-lg shadow-primary/30"
                      : "text-foreground/70 hover:bg-secondary/50"
                  )}>
                    예약하기
                  </button>
                </Link>
                <Link href="/login">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-border hover:bg-secondary/20 transition-all text-sm font-medium text-foreground/80" data-testid="link-login">
                    <User className="h-4 w-4" />
                    <span>로그인</span>
                  </button>
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
