import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type LoginInput, type UserWithShop } from "@shared/routes";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// 로그인 없이 자동 접속되는 기본 사용자
const DEFAULT_USER: UserWithShop = {
  id: 1,
  email: "test@test.com",
  password: "",
  role: "shop_owner",
  shopId: 1,
  shopName: "정리하개 강남점",
  phone: "010-1234-5678",
  address: "서울 강남구 테헤란로 123",
  shop: {
    id: 1,
    name: "정리하개 강남점",
    slug: "gangnam",
    phone: "02-123-4567",
    address: "서울 강남구 테헤란로 123",
    businessHours: "09:00-18:00",
    depositAmount: 10000,
    depositRequired: true,
    isApproved: true,
    createdAt: new Date()
  }
};

export function useAuth() {
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  // 로그인 기능 제거 - 항상 기본 사용자로 접속
  const { data: user, isLoading } = useQuery<UserWithShop | null>({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      return DEFAULT_USER;
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginInput) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
        if (res.status === 403) {
          const data = await res.json();
          throw new Error(data.message || "가맹점 승인 대기중입니다.");
        }
        throw new Error("로그인에 실패했습니다.");
      }
      
      return await res.json() as UserWithShop;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.auth.me.path], data);
      
      if (data.role === 'super_admin') {
        toast({
          title: "환영합니다!",
          description: "총 관리자님 로그인되었습니다.",
        });
        setLocation("/admin/platform");
      } else {
        toast({
          title: "환영합니다!",
          description: `${data.shop?.name || data.shopName} 관리자님 로그인되었습니다.`,
        });
        setLocation("/admin/dashboard");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "로그인 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.logout.path, {
        method: api.auth.logout.method,
      });
      if (!res.ok) throw new Error("로그아웃 실패");
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      setLocation("/");
      toast({
        title: "로그아웃",
        description: "성공적으로 로그아웃되었습니다.",
      });
    },
  });

  return {
    user,
    isLoading,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
