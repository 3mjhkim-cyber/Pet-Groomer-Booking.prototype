import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, Users, CalendarDays, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const shopOwnerNavItems = [
  { href: "/admin/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/customers", label: "고객", icon: Users },
  { href: "/admin/calendar", label: "캘린더", icon: CalendarDays },
  { href: "/admin/revenue", label: "매출", icon: TrendingUp },
  { href: "/admin/settings", label: "설정", icon: Settings },
];

export function MobileBottomNav() {
  const { user } = useAuth();
  const [location] = useLocation();

  // Shop owner만 표시
  if (!user || user.role !== "shop_owner") {
    return null;
  }

  // 예약 페이지에서는 숨김
  if (location.startsWith("/book/")) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border safe-area-bottom">
      <div className="grid grid-cols-5 h-16">
        {shopOwnerNavItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  "w-full h-full flex flex-col items-center justify-center gap-0.5 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={cn(
                    "text-[10px] leading-tight",
                    isActive ? "font-semibold" : "font-medium"
                  )}
                >
                  {item.label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
