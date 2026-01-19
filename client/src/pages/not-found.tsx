import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md mx-4 glass-card border-2 border-border/50">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            요청하신 페이지를 찾을 수 없습니다. 주소를 다시 확인해주세요.
          </p>
          
          <div className="mt-6">
            <Link href="/">
              <button className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                메인으로 돌아가기
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
