import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Store, ArrowLeft, Search } from "lucide-react";
import { formatKoreanPhone } from "@/lib/phone";

declare global {
  interface Window {
    daum: any;
  }
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,}$/;

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

  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "이메일을 입력해주세요.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "올바른 이메일 형식이 아닙니다.";
    }

    if (!formData.password) {
      newErrors.password = "비밀번호를 입력해주세요.";
    } else if (!PASSWORD_REGEX.test(formData.password)) {
      newErrors.password = "비밀번호는 영문 대문자, 소문자, 숫자, 특수문자를 포함하여 10자 이상이어야 합니다.";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "비밀번호 확인을 입력해주세요.";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "비밀번호가 일치하지 않습니다.";
    }

    if (!formData.shopName.trim()) {
      newErrors.shopName = "가게 이름을 입력해주세요.";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "전화번호를 입력해주세요.";
    }

    if (!formData.address.trim()) {
      newErrors.address = "주소를 검색하여 선택해주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const registerMutation = useMutation({
    mutationFn: async () => {
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
        description: "로그인 후 구독을 활성화하시면 바로 서비스를 이용하실 수 있습니다.",
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
    if (validateForm()) {
      registerMutation.mutate();
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatKoreanPhone(e.target.value);
    setFormData(f => ({ ...f, phone: formatted }));
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
              <Label htmlFor="email">이메일 <span className="text-destructive">*</span></Label>
              <Input 
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData(f => ({...f, email: e.target.value}))}
                placeholder="shop@example.com"
                data-testid="input-email"
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 <span className="text-destructive">*</span></Label>
              <Input 
                id="password"
                type="password"
                value={formData.password}
                onChange={e => setFormData(f => ({...f, password: e.target.value}))}
                data-testid="input-password"
                className={errors.password ? "border-destructive" : ""}
              />
              <p className="text-xs text-muted-foreground">영문 대문자, 소문자, 숫자, 특수문자 포함 10자 이상</p>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인 <span className="text-destructive">*</span></Label>
              <Input 
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={e => setFormData(f => ({...f, confirmPassword: e.target.value}))}
                data-testid="input-confirm-password"
                className={errors.confirmPassword ? "border-destructive" : ""}
              />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
            </div>

            <hr className="my-4" />
            
            <div className="space-y-2">
              <Label htmlFor="shopName">가게 이름 <span className="text-destructive">*</span></Label>
              <Input 
                id="shopName"
                value={formData.shopName}
                onChange={e => setFormData(f => ({...f, shopName: e.target.value}))}
                placeholder="정리하개 강남점"
                data-testid="input-shop-name"
                className={errors.shopName ? "border-destructive" : ""}
              />
              {errors.shopName && <p className="text-sm text-destructive">{errors.shopName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호 <span className="text-destructive">*</span></Label>
              <Input 
                id="phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="010-1234-5678"
                data-testid="input-phone"
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">도로명 주소 <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input 
                  id="address"
                  value={formData.address}
                  placeholder="주소 검색을 눌러주세요"
                  readOnly
                  className={`flex-1 bg-muted cursor-pointer ${errors.address ? "border-destructive" : ""}`}
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
              {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
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
