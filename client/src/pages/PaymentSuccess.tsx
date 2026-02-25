import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentSuccess() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentId = urlParams.get('paymentId');
        const txId = urlParams.get('txId');
        const tier = urlParams.get('tier');

        if (!paymentId) {
          throw new Error('결제 정보가 올바르지 않습니다.');
        }

        // 백엔드에서 결제 검증
        const response = await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ paymentId, txId, tier }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || '결제 검증에 실패했습니다.');
        }

        setIsProcessing(false);
        toast({
          title: "결제 완료!",
          description: "구독이 성공적으로 활성화되었습니다.",
        });

        // 3초 후 대시보드로 이동
        setTimeout(() => {
          setLocation('/admin/dashboard');
        }, 3000);
      } catch (err: any) {
        setError(err.message);
        setIsProcessing(false);
      }
    };

    confirmPayment();
  }, [toast, setLocation]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/10 p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">결제 오류</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/admin/subscription')} className="w-full">
              구독 페이지로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>결제 처리 중</CardTitle>
            <CardDescription>잠시만 기다려주세요...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/10 p-4">
      <Card className="w-full max-w-md border-green-200">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          </div>
          <CardTitle className="text-center text-2xl">결제가 완료되었습니다!</CardTitle>
          <CardDescription className="text-center">
            구독이 성공적으로 활성화되었습니다.<br />
            잠시 후 대시보드로 이동합니다...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setLocation('/admin/dashboard')} className="w-full">
            대시보드로 이동
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
