import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Store, ArrowLeft, Search } from "lucide-react";

declare global {
  interface Window {
    daum: any;
  }
}

export default function Register() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    shopName: '',
    phone: '',
    address: '',
    addressDetail: '',
  });

  useEffect(() => {
    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const openAddressSearch = () => {
    if (!window.daum) {
      toast({
        title: "주소 검색 로드 중",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        const fullAddress = data.roadAddress || data.jibunAddress;
        setFormData(f => ({ ...f, address: fullAddress }));
      },
    }).open();
  };

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (formData.password !== formData.confirmPassword) {
        throw new Error("비밀번호가 일치하지 않습니다.");
      }

      if (!formData.address) {
        throw new Error("주소를 검색하여 선택해주세요.");
      }

      const fullAddress = formData.addressDetail 
        ? `${formData.address} ${formData.addressDetail}`
        : formData.address;

      const res = await fetch('/api/shops/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          shop: {
            name: formData.shopName,
            phone: formData.phone,
            address: fullAddress,
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
                onChange={e => setFormData(f => ({...f, shopName: e.target.value}))}
                placeholder="정리하개 강남점"
                required
                data-testid="input-shop-name"
              />
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
              <Label htmlFor="address">도로명 주소</Label>
              <div className="flex gap-2">
                <Input 
                  id="address"
                  value={formData.address}
                  placeholder="주소 검색을 눌러주세요"
                  readOnly
                  className="flex-1 bg-muted cursor-pointer"
                  onClick={openAddressSearch}
                  data-testid="input-address"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={openAddressSearch}
                  data-testid="button-address-search"
                >
                  <Search className="w-4 h-4 mr-2" />
                  검색
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressDetail">상세 주소</Label>
              <Input 
                id="addressDetail"
                value={formData.addressDetail}
                onChange={e => setFormData(f => ({...f, addressDetail: e.target.value}))}
                placeholder="건물명, 층, 호수 등"
                data-testid="input-address-detail"
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
