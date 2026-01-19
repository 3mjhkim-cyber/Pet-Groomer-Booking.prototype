import { useBooking, useConfirmDeposit } from "@/hooks/use-shop";
import { useParams } from "wouter";
import { Loader2, Clock, Scissors, User, Phone, CheckCircle2, XCircle, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function Deposit() {
  const { id } = useParams<{ id: string }>();
  const { data: booking, isLoading } = useBooking(Number(id));
  const { mutate: confirmDeposit, isPending } = useConfirmDeposit();
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!booking?.depositDeadline) return;

    const updateTimer = () => {
      const deadline = new Date(booking.depositDeadline!);
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [booking?.depositDeadline]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">예약을 찾을 수 없습니다</h1>
          <p className="text-muted-foreground">유효하지 않은 링크입니다.</p>
        </div>
      </div>
    );
  }

  if (booking.depositStatus === 'paid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="text-center p-8">
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-green-700 mb-2">입금 완료</h1>
          <p className="text-green-600 text-lg">예약금 입금이 확인되었습니다.</p>
          <p className="text-muted-foreground mt-4">
            {booking.date} {booking.time}에 방문해주세요!
          </p>
        </div>
      </div>
    );
  }

  if (booking.depositStatus === 'none') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Banknote className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">예약금 요청 대기 중</h1>
          <p className="text-muted-foreground">업체에서 아직 예약금을 요청하지 않았습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">예약금 입금</h1>
          <p className="text-muted-foreground">정리하개 강남점</p>
        </div>

        {/* Timer */}
        <div className={`rounded-2xl p-6 mb-6 text-center ${isExpired ? 'bg-red-50 border-2 border-red-200' : 'bg-primary/5 border-2 border-primary/20'}`}>
          {isExpired ? (
            <>
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-red-600">만료됨</h2>
              <p className="text-red-500 mt-2">입금 시간이 초과되었습니다.</p>
            </>
          ) : (
            <>
              <Clock className="w-10 h-10 text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-2">남은 시간</p>
              <div className="text-4xl font-mono font-bold text-primary" data-testid="text-timer">
                {timeLeft && `${String(timeLeft.hours).padStart(2, '0')}:${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`}
              </div>
            </>
          )}
        </div>

        {/* Booking Info */}
        <div className="bg-white rounded-2xl p-6 border border-border shadow-sm mb-6">
          <h3 className="font-bold text-lg mb-4">예약 정보</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">예약자</div>
                <div className="font-medium">{booking.customerName}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">연락처</div>
                <div className="font-medium font-mono">{booking.customerPhone}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">서비스</div>
                <div className="font-medium">{booking.serviceName}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">예약 일시</div>
                <div className="font-medium">{booking.date} {booking.time}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Deposit Info */}
        <div className="bg-white rounded-2xl p-6 border border-border shadow-sm mb-6">
          <h3 className="font-bold text-lg mb-4">입금 안내</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">예약금</span>
              <span className="font-bold">10,000원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">입금 계좌</span>
              <span className="font-mono">국민 123-456-789012</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">예금주</span>
              <span>정리하개</span>
            </div>
          </div>
        </div>

        {!isExpired && (
          <Button 
            size="lg" 
            className="w-full py-6 text-lg gap-2" 
            onClick={() => confirmDeposit(Number(id))}
            disabled={isPending}
            data-testid="button-confirm-deposit"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                입금 완료
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
