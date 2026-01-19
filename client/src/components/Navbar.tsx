import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Scissors, User, LogOut, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="bg-primary/20 p-2 rounded-full group-hover:bg-primary/30 transition-colors">
            <Scissors className="h-6 w-6 text-primary group-hover:rotate-12 transition-transform" />
          </div>
          <span className="text-xl font-bold text-foreground">안녕 강아지와 고양이</span>
        </Link>

        <div className="flex items-center gap-4">
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

          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/admin/dashboard">
                <button className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all",
                  location === "/admin/dashboard" 
                    ? "bg-secondary text-secondary-foreground" 
                    : "text-foreground/70 hover:bg-secondary/30"
                )}>
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">관리자</span>
                </button>
              </Link>
              <button 
                onClick={() => logout()}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                title="로그아웃"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <Link href="/login">
              <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-border hover:bg-secondary/20 transition-all text-sm font-medium text-foreground/80">
                <User className="h-4 w-4" />
                <span>사장님 로그인</span>
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
