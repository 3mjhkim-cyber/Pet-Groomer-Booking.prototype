import { useLocation } from "wouter";
import { XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentFail() {
  const [_, setLocation] = useLocation();

  const urlParams = new URLSearchParams(window.location.search);
  const message = urlParams.get('message') || '결제가 취소되었거나 오류가 발생했습니다.';
  const code = urlParams.get('code');

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/10 p-4">
      <Card className="w-full max-w-md border-destructive">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <XCircle className="w-16 h-16 text-destructive" />
          </div>
          <CardTitle className="text-center text-2xl text-destructive">결제 실패</CardTitle>
          <CardDescription className="text-center">
            {message}
            {code && <><br /><span className="text-xs text-muted-foreground">오류 코드: {code}</span></>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button onClick={() => setLocation('/admin/subscription')} className="w-full">
            다시 시도하기
          </Button>
          <Button onClick={() => setLocation('/admin/dashboard')} variant="outline" className="w-full">
            대시보드로 돌아가기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
