import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { Link } from "wouter";
import { Loader2, Dog, ArrowLeft, Store } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const SAVED_EMAIL_KEY = "saved_login_email";

const loginSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginResult, setLoginResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // 저장된 이메일 불러오기
  const savedEmail = typeof window !== 'undefined' ? localStorage.getItem(SAVED_EMAIL_KEY) || "" : "";

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: savedEmail,
      password: "",
    },
  });

  // 저장된 이메일이 있으면 아이디 저장 체크
  useEffect(() => {
    if (savedEmail) {
      setRememberMe(true);
    }
  }, []);

  const onSubmit = async (data: LoginForm) => {
    // 아이디 저장 처리
    if (rememberMe) {
      localStorage.setItem(SAVED_EMAIL_KEY, data.email);
    } else {
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }

    setIsLoggingIn(true);
    setLoginResult(null);

    if (!supabase) {
      setIsLoggingIn(false);
      setLoginResult({ type: "error", message: "Supabase 연결이 설정되지 않았습니다. 환경변수를 확인해주세요." });
      return;
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    setIsLoggingIn(false);

    if (error) {
      setLoginResult({ type: "error", message: error.message });
    } else {
      const email = authData.user?.email ?? "";
      const role =
        authData.user?.user_metadata?.role ||
        authData.user?.app_metadata?.role ||
        (email === "admin@jeongridog.com" ? "super_admin" : "shop_owner");
      setLoginResult({ type: "success", message: `로그인 성공! (${email})` });
      const target = role === "super_admin" ? "/admin/platform" : "/admin/dashboard";
      window.location.href = target;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          메인으로 돌아가기
        </Link>
        
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4">
              <Dog className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">사장님 로그인</CardTitle>
            <CardDescription>매장 관리 시스템에 접속하세요</CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  {...form.register("email")}
                  id="email"
                  type="email"
                  placeholder="이메일을 입력하세요"
                  data-testid="input-email"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  {...form.register("password")}
                  id="password"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  data-testid="input-password"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <label
                  htmlFor="rememberMe"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  아이디 저장
                </label>
              </div>

              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full"
                data-testid="button-login"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    로그인 중...
                  </>
                ) : (
                  "로그인"
                )}
              </Button>

              {loginResult && (
                <div className={`mt-3 p-3 rounded-md text-sm ${
                  loginResult.type === "error"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-green-50 text-green-700"
                }`}>
                  {loginResult.message}
                </div>
              )}
            </form>
            
            <div className="mt-6 pt-6 border-t border-dashed text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                테스트 계정: test@shop.com / test1234
              </p>
              <p className="text-sm text-muted-foreground">
                총관리자: admin@jeongridog.com / admin1234
              </p>
              
              <div className="pt-3">
                <Link href="/register">
                  <Button variant="outline" className="w-full" data-testid="link-register">
                    <Store className="w-4 h-4 mr-2" />
                    가맹점 등록 신청하기
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
