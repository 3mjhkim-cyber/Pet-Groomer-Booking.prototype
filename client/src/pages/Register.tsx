import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Store, ArrowLeft } from "lucide-react";

export default function Register() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    shopName: '',
    shopSlug: '',
    phone: '',
    address: '',
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (formData.password !== formData.confirmPassword) {
        throw new Error("비밀번호가 일치하지 않습니다.");
      }

      const res = await fetch('/api/shops/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          shop: {
            name: formData.shopName,
            slug: formData.shopSlug,
            phone: formData.phone,
            address: formData.address,
          },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "등록에 실패했습니다.");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "가맹점 등록 완료",
        description: "관리자 승인 후 서비스를 이용하실 수 있습니다.",
      });
      setLocation("/login");
    },
    onError: (error: Error) => {
      toast({
        title: "등록 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate();
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">가맹점 등록</CardTitle>
          <CardDescription>정리하개에 가맹점을 등록하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input 
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData(f => ({...f, email: e.target.value}))}
                placeholder="shop@example.com"
                required
                data-testid="input-email"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input 
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData(f => ({...f, password: e.target.value}))}
                  required
                  data-testid="input-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <Input 
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={e => setFormData(f => ({...f, confirmPassword: e.target.value}))}
                  required
                  data-testid="input-confirm-password"
                />
              </div>
            </div>

            <hr className="my-4" />
            
            <div className="space-y-2">
              <Label htmlFor="shopName">가게 이름</Label>
              <Input 
                id="shopName"
                value={formData.shopName}
                onChange={e => {
                  const name = e.target.value;
                  setFormData(f => ({
                    ...f, 
                    shopName: name,
                    shopSlug: formData.shopSlug || generateSlug(name)
                  }));
                }}
                placeholder="정리하개 강남점"
                required
                data-testid="input-shop-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopSlug">예약 페이지 URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/book/</span>
                <Input 
                  id="shopSlug"
                  value={formData.shopSlug}
                  onChange={e => setFormData(f => ({...f, shopSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')}))}
                  placeholder="gangnam"
                  required
                  data-testid="input-shop-slug"
                />
              </div>
              <p className="text-xs text-muted-foreground">영문 소문자와 숫자, 하이픈만 사용 가능합니다</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input 
                id="phone"
                value={formData.phone}
                onChange={e => setFormData(f => ({...f, phone: e.target.value}))}
                placeholder="02-123-4567"
                required
                data-testid="input-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Input 
                id="address"
                value={formData.address}
                onChange={e => setFormData(f => ({...f, address: e.target.value}))}
                placeholder="서울 강남구 테헤란로 123"
                required
                data-testid="input-address"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={registerMutation.isPending}
              data-testid="button-register"
            >
              {registerMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              가맹점 등록 신청
            </Button>

            <div className="text-center">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setLocation('/login')}
                data-testid="button-back-to-login"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                로그인으로 돌아가기
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
