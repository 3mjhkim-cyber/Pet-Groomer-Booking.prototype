import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type LoginInput, type UserWithShop } from "@shared/routes";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useAuth() {
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  // 서버에서 현재 로그인된 사용자 정보 조회
  const { data: user, isLoading } = useQuery<UserWithShop | null>({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, { credentials: "include" });
      if (!res.ok) return null;
      return await res.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5분간 캐시
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      
      if (!res.ok) {
        let message = "로그인에 실패했습니다.";
        try {
          const data = await res.json();
          message = data.message || message;
        } catch {}
        throw new Error(message);
      }
      
      return await res.json() as UserWithShop;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.auth.me.path], data);
      
      // localStorage에 로그인 정보 저장
      localStorage.setItem('user', JSON.stringify({
        userId: data.id,
        email: data.email,
        role: data.role,
        shopId: data.shopId,
        shopName: data.shopName,
      }));
      
      if (data.role === 'super_admin') {
        toast({
          title: "환영합니다!",
          description: "관리자님 로그인되었습니다.",
        });
        setLocation("/admin/platform");
      } else {
        toast({
          title: "환영합니다!",
          description: `${data.shop?.name || data.shopName} 사장님 로그인되었습니다.`,
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
      localStorage.removeItem('user');
      setLocation("/login");
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
