import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface AuthUser {
  id: string;
  email: string;
  role: string;
  shopId?: number;
  shopName?: string;
  shop?: { name: string };
}

async function fetchProfile(userId: string): Promise<{ role: string } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return data as { role: string };
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

      const profile = await fetchProfile(session.user.id);
      const role = profile?.role || "shop_owner";

      return {
        id: session.user.id,
        email: session.user.email ?? "",
        role,
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

      const profile = await fetchProfile(data.user.id);
      const role = profile?.role || "shop_owner";

      return {
        id: data.user.id,
        email: data.user.email ?? "",
        role,
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
