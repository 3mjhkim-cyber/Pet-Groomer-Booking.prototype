import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Loader2, Store, Check, X, Users, Calendar, LogOut, Settings, Bell, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Shop } from "@shared/schema";

export default function PlatformAdmin() {
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shops, isLoading: isShopsLoading } = useQuery<Shop[]>({
    queryKey: ['/api/admin/shops'],
    enabled: !!user && user.role === 'super_admin',
  });

  const approveMutation = useMutation({
    mutationFn: async (shopId: number) => {
      const res = await apiRequest('PATCH', `/api/admin/shops/${shopId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shops'] });
      toast({ title: "승인 완료", description: "가맹점이 승인되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "승인 실패", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (shopId: number) => {
      const res = await apiRequest('DELETE', `/api/admin/shops/${shopId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shops'] });
      toast({ title: "거절 완료", description: "가맹점 승인이 취소되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "거절 실패", description: error.message, variant: "destructive" });
    },
  });

  if (isAuthLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user || user.role !== 'super_admin') {
    setLocation("/login");
    return null;
  }

  const pendingShops = shops?.filter(s => !s.isApproved) || [];
  const approvedShops = shops?.filter(s => s.isApproved) || [];

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">정리하개 플랫폼 관리</h1>
              <p className="text-sm text-muted-foreground">총 관리자</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => logout()} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">전체 가맹점</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{shops?.length || 0}</div>
            </CardContent>
          </Card>
          <Link href="/admin/approvals">
            <Card className="hover-elevate cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">계정 승인 관리</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  <span>바로가기</span>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">운영 중</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedShops.length}</div>
            </CardContent>
          </Card>
        </div>

        {pendingShops.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              승인 대기 중인 가맹점 ({pendingShops.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingShops.map(shop => (
                <Card key={shop.id} className="border-orange-200" data-testid={`card-pending-shop-${shop.id}`}>
                  <CardHeader>
                    <CardTitle className="text-lg">{shop.name}</CardTitle>
                    <CardDescription>/{shop.slug}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm mb-4">
                      <p><span className="text-muted-foreground">전화:</span> {shop.phone}</p>
                      <p><span className="text-muted-foreground">주소:</span> {shop.address}</p>
                      <p><span className="text-muted-foreground">예약금:</span> {shop.depositAmount.toLocaleString()}원</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1 gap-1"
                        onClick={() => approveMutation.mutate(shop.id)}
                        disabled={approveMutation.isPending}
                        data-testid={`button-approve-shop-${shop.id}`}
                      >
                        <Check className="w-4 h-4" />
                        승인
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="flex-1 gap-1"
                        onClick={() => rejectMutation.mutate(shop.id)}
                        disabled={rejectMutation.isPending}
                        data-testid={`button-reject-shop-${shop.id}`}
                      >
                        <X className="w-4 h-4" />
                        거절
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            운영 중인 가맹점 ({approvedShops.length})
          </h2>
          {isShopsLoading ? (
            <div className="text-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            </div>
          ) : approvedShops.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-border">
              <p className="text-muted-foreground">등록된 가맹점이 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedShops.map(shop => (
                <Card key={shop.id} data-testid={`card-approved-shop-${shop.id}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{shop.name}</CardTitle>
                        <CardDescription>/{shop.slug}</CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        운영중
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-muted-foreground">전화:</span> {shop.phone}</p>
                      <p><span className="text-muted-foreground">주소:</span> {shop.address}</p>
                      <p><span className="text-muted-foreground">영업시간:</span> {shop.businessHours}</p>
                      <p><span className="text-muted-foreground">예약금:</span> {shop.depositAmount.toLocaleString()}원</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
