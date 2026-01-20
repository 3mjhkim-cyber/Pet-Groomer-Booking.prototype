import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, ArrowLeft, UserCheck, Clock, Store } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface PendingUser {
  id: number;
  email: string;
  shopName: string | null;
  phone: string | null;
  address: string | null;
  businessNumber: string | null;
  createdAt: string;
  status: string;
}

export default function Approvals() {
  const { user, isLoading: authLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 권한 체크: super_admin만 접근 가능
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    } else if (!authLoading && user && user.role !== 'super_admin') {
      toast({
        title: "접근 권한 없음",
        description: "관리자만 접근할 수 있습니다.",
        variant: "destructive",
      });
      setLocation("/admin/dashboard");
    }
  }, [user, authLoading, setLocation, toast]);

  // 승인 대기 사용자 목록 조회
  const { data: pendingUsers = [], isLoading } = useQuery<PendingUser[]>({
    queryKey: ['/api/admin/pending-users'],
    enabled: !!user && user.role === 'super_admin',
  });

  // 승인 처리
  const approveMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error("승인 처리에 실패했습니다.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-users/count'] });
      toast({
        title: "승인 완료",
        description: "가맹점이 승인되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "승인 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 거절 처리
  const rejectMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/users/${userId}/reject`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error("거절 처리에 실패했습니다.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-users/count'] });
      toast({
        title: "거절 완료",
        description: "가맹점 신청이 거절되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "거절 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user.role !== 'super_admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin/platform" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          플랫폼 관리로 돌아가기
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">계정 승인 관리</CardTitle>
                <CardDescription>가맹점 신청을 검토하고 승인/거절하세요</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">승인 대기 중인 가맹점이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map((pendingUser) => (
                  <Card key={pendingUser.id} className="border-l-4 border-l-orange-400">
                    <CardContent className="pt-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Store className="w-5 h-5 text-primary" />
                            <span className="font-semibold text-lg">{pendingUser.shopName || '미입력'}</span>
                            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                              승인 대기
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">이메일:</span> {pendingUser.email}
                            </div>
                            <div>
                              <span className="font-medium">전화번호:</span> {pendingUser.phone || '-'}
                            </div>
                            <div className="md:col-span-2">
                              <span className="font-medium">주소:</span> {pendingUser.address || '-'}
                            </div>
                            {pendingUser.businessNumber && (
                              <div>
                                <span className="font-medium">사업자번호:</span> {pendingUser.businessNumber}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">신청일:</span>{" "}
                              {pendingUser.createdAt ? format(new Date(pendingUser.createdAt), 'yyyy년 M월 d일 HH:mm', { locale: ko }) : '-'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectMutation.mutate(pendingUser.id)}
                            disabled={rejectMutation.isPending || approveMutation.isPending}
                            className="text-destructive hover:bg-destructive hover:text-white"
                            data-testid={`button-reject-${pendingUser.id}`}
                          >
                            {rejectMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                거절
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(pendingUser.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            data-testid={`button-approve-${pendingUser.id}`}
                          >
                            {approveMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                승인
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
