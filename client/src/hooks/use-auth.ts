import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

const SUPER_ADMIN_EMAILS = ["admin@jeongridog.com"];

function resolveRole(user: User): string {
  return (
    user.user_metadata?.role ||
    user.app_metadata?.role ||
    (SUPER_ADMIN_EMAILS.includes(user.email ?? "") ? "super_admin" : "shop_owner")
  );
}

interface AuthUser {
  id: string;
  email: string;
  role?: string;
  shopId?: number;
  shopName?: string;
  shop?: { name: string };
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["supabase-user"],
    queryFn: async () => {
      if (!supabase) return null;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
      return {
        id: session.user.id,
        email: session.user.email ?? "",
        role: resolveRole(session.user),
      };
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      if (!supabase) throw new Error("Supabase가 설정되지 않았습니다.");
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error) throw new Error(error.message);
      return {
        id: data.user.id,
        email: data.user.email ?? "",
        role: resolveRole(data.user),
      } as AuthUser;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["supabase-user"], data);
      toast({ title: "환영합니다!", description: `${data.email} 로그인되었습니다.` });
      const target = data.role === "super_admin" ? "/admin/platform" : "/admin/dashboard";
      window.location.href = target;
    },
    onError: (error: Error) => {
      toast({ title: "로그인 실패", description: error.message, variant: "destructive" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error("Supabase가 설정되지 않았습니다.");
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.setQueryData(["supabase-user"], null);
      localStorage.removeItem("user");
      window.location.href = "/login";
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
