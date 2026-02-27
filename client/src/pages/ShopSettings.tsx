import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, User, Key, CreditCard, ArrowLeft, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import type { Shop } from "@shared/schema";

export default function ShopSettings() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shop, isLoading: isShopLoading } = useQuery<Shop>({
    queryKey: ['/api/shop/settings'],
    queryFn: async () => {
      const res = await fetch('/api/shop/settings');
      if (!res.ok) throw new Error('Failed to fetch shop settings');
      return res.json();
    },
    enabled: !!user && user.role === 'shop_owner',
  });

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || '비밀번호 변경 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsPasswordDialogOpen(false);
      toast({ title: '변경 완료', description: '비밀번호가 변경되었습니다.' });
    },
    onError: (error: Error) => {
      toast({ title: '변경 실패', description: error.message, variant: 'destructive' });
    },
  });

  useEffect(() => {
    if (!isAuthLoading && (!user || user.role !== 'shop_owner')) {
      setLocation('/login');
    }
  }, [isAuthLoading, user, setLocation]);

  useEffect(() => {
    if (user?.shop) {
      const s = user.shop as any;
      const accessible = s.subscriptionStatus === 'active' ||
        (s.subscriptionStatus === 'cancelled' && s.subscriptionEnd && new Date(s.subscriptionEnd) > new Date());
      if (!accessible) setLocation('/admin/subscription');
    }
  }, [user, setLocation]);

  if (isAuthLoading || isShopLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user || user.role !== 'shop_owner') return null;

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({ title: '입력 오류', description: '모든 필드를 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: '입력 오류', description: '새 비밀번호가 일치하지 않습니다.', variant: 'destructive' });
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,}$/;
    if (!passwordRegex.test(passwordForm.newPassword)) {
      toast({
        title: '비밀번호 형식 오류',
        description: '영문 대문자, 소문자, 숫자, 특수문자를 포함하여 10자 이상이어야 합니다.',
        variant: 'destructive',
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const isSubscriptionActive = shop?.subscriptionStatus === 'active';
  const subscriptionLabel =
    shop?.subscriptionStatus === 'active' ? '활성' :
    shop?.subscriptionStatus === 'expired' ? '만료' :
    shop?.subscriptionStatus === 'cancelled' ? '취소됨' : '미구독';

  const planLabel =
    shop?.subscriptionTier === 'basic' ? '베이직' :
    shop?.subscriptionTier === 'premium' ? '프리미엄' :
    shop?.subscriptionTier === 'enterprise' ? '엔터프라이즈' : '';

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-foreground/70" />
          </div>
          <div>
            <h1 className="font-bold text-lg">설정</h1>
            <p className="text-sm text-muted-foreground">계정 및 구독 관리</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {/* 계정 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" /> 계정 정보
            </CardTitle>
            <CardDescription>로그인 계정 정보입니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">이메일 / 아이디</Label>
                <p className="text-sm font-medium bg-secondary/40 px-3 py-2 rounded-lg">
                  {(user as any).email || (user as any).username || '-'}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">가게명</Label>
                <div className="flex items-center gap-2 bg-secondary/40 px-3 py-2 rounded-lg">
                  <p className="text-sm font-medium flex-1">{shop?.name || '-'}</p>
                  <button
                    onClick={() => setLocation('/admin/operations')}
                    className="text-xs text-primary hover:underline flex items-center gap-0.5"
                  >
                    수정 <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 비밀번호 변경 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" /> 비밀번호
            </CardTitle>
            <CardDescription>로그인 비밀번호를 변경합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(true)} data-testid="button-open-password-dialog">
              <Key className="w-4 h-4 mr-2" />
              비밀번호 변경
            </Button>
          </CardContent>
        </Card>

        {/* 구독 관리 */}
        <Card className={isSubscriptionActive ? 'border-green-200 bg-green-50/50' : 'border-orange-200 bg-orange-50/50'}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isSubscriptionActive
                  ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                  : <AlertCircle className="w-5 h-5 text-orange-500" />
                }
                구독 관리
              </div>
              <Badge variant={isSubscriptionActive ? 'default' : 'secondary'}>
                {subscriptionLabel}
              </Badge>
            </CardTitle>
            <CardDescription>
              {isSubscriptionActive
                ? `${planLabel} 플랜 이용 중`
                : '구독을 활성화하여 서비스를 이용하세요'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              onClick={() => setLocation('/admin/subscription')}
              variant={isSubscriptionActive ? 'outline' : 'default'}
            >
              {isSubscriptionActive ? '구독 관리' : '구독하기'}
            </Button>
            {isSubscriptionActive && shop?.subscriptionEnd && (
              <p className="text-sm text-muted-foreground">
                만료일: {new Date(shop.subscriptionEnd).toLocaleDateString('ko-KR')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 결제 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> 결제 정보
            </CardTitle>
            <CardDescription>구독 및 결제 내역을 관리합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              결제 수단 변경 및 결제 내역은 구독 관리 페이지에서 확인하실 수 있습니다.
            </p>
            <Button variant="outline" onClick={() => setLocation('/admin/subscription')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              구독 관리 바로가기
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* 비밀번호 변경 다이얼로그 */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => {
        setIsPasswordDialogOpen(open);
        if (!open) setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" /> 비밀번호 변경
            </DialogTitle>
            <DialogDescription>로그인 비밀번호를 변경합니다</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="current-password">현재 비밀번호</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="현재 비밀번호를 입력하세요"
                data-testid="input-current-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">새 비밀번호</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="새 비밀번호를 입력하세요"
                data-testid="input-new-password"
              />
              <p className="text-xs text-muted-foreground">
                영문 대문자, 소문자, 숫자, 특수문자를 포함하여 10자 이상
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="새 비밀번호를 다시 입력하세요"
                data-testid="input-confirm-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={changePasswordMutation.isPending} data-testid="button-change-password">
              {changePasswordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              비밀번호 변경
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
