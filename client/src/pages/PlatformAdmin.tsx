import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, Store, Calendar, LogOut, Settings, Pencil, Trash2, CreditCard, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useMemo, useEffect } from "react";
import type { Shop } from "@shared/schema";

export default function PlatformAdmin() {
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [deletingShop, setDeletingShop] = useState<Shop | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
    businessHours: '',
    depositAmount: 0,
    depositRequired: true,
    subscriptionStatus: 'none',
    subscriptionTier: 'basic',
    subscriptionEnd: '',
    password: '',
  });

  const { data: shops, isLoading: isShopsLoading } = useQuery<Shop[]>({
    queryKey: ['/api/admin/shops'],
    enabled: !!user && user.role === 'super_admin',
  });

  const editMutation = useMutation({
    mutationFn: async ({ shopId, data }: { shopId: number; data: typeof editForm }) => {
      const res = await apiRequest('PATCH', `/api/admin/shops/${shopId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shops'] });
      toast({ title: "수정 완료", description: "가맹점 정보가 수정되었습니다." });
      setEditingShop(null);
    },
    onError: (error: Error) => {
      toast({ title: "수정 실패", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (shopId: number) => {
      const res = await apiRequest('DELETE', `/api/admin/shops/${shopId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shops'] });
      toast({ title: "삭제 완료", description: "가맹점이 삭제되었습니다." });
      setDeletingShop(null);
    },
    onError: (error: Error) => {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    },
  });

  const openEditModal = (shop: Shop) => {
    setEditForm({
      name: shop.name,
      phone: shop.phone,
      address: shop.address,
      businessHours: shop.businessHours,
      depositAmount: shop.depositAmount,
      depositRequired: shop.depositRequired,
      subscriptionStatus: shop.subscriptionStatus || 'none',
      subscriptionTier: shop.subscriptionTier || 'basic',
      subscriptionEnd: shop.subscriptionEnd ? new Date(shop.subscriptionEnd).toISOString().split('T')[0] : '',
      password: '',
    });
    setEditingShop(shop);
  };

  const pendingShops = shops?.filter(s => !s.isApproved) || [];

  const approvedShops = useMemo(() => {
    const approved = shops?.filter(s => s.isApproved) || [];
    if (!searchQuery.trim()) return approved;
    const query = searchQuery.toLowerCase();
    return approved.filter(shop =>
      shop.name.toLowerCase().includes(query) ||
      shop.phone.includes(query) ||
      shop.address.toLowerCase().includes(query) ||
      shop.slug.toLowerCase().includes(query)
    );
  }, [shops, searchQuery]);

  useEffect(() => {
    if (!isAuthLoading && (!user || user.role !== 'super_admin')) {
      setLocation("/login");
    }
  }, [isAuthLoading, user, setLocation]);

  if (isAuthLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user || user.role !== 'super_admin') {
    return null;
  }

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">전체 가맹점</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{shops?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">활성 구독</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{shops?.filter(s => s.subscriptionStatus === 'active').length || 0}</div>
            </CardContent>
          </Card>
        </div>

        <section>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              가맹점 목록 ({approvedShops.length})
            </h2>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="가맹점 이름, 전화번호, 주소, 슬러그 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
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
                        <CardDescription>샵 ID: {shop.id}</CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        운영중
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm mb-4">
                      <p><span className="text-muted-foreground">전화:</span> {shop.phone}</p>
                      <p><span className="text-muted-foreground">주소:</span> {shop.address}</p>
                      <p><span className="text-muted-foreground">영업시간:</span> {shop.businessHours}</p>
                      <p><span className="text-muted-foreground">예약금:</span> {shop.depositAmount.toLocaleString()}원</p>
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">구독:</span>
                        <Badge variant={shop.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                          {shop.subscriptionStatus === 'active' ? '활성' :
                           shop.subscriptionStatus === 'expired' ? '만료' :
                           shop.subscriptionStatus === 'cancelled' ? '취소' : '미구독'}
                        </Badge>
                        {shop.subscriptionStatus === 'active' && (
                          <span className="text-xs text-muted-foreground">
                            ({shop.subscriptionTier === 'basic' ? '베이직' :
                              shop.subscriptionTier === 'premium' ? '프리미엄' : '엔터프라이즈'})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1"
                        onClick={() => openEditModal(shop)}
                        data-testid={`button-edit-shop-${shop.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                        편집
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 gap-1"
                        onClick={() => setDeletingShop(shop)}
                        data-testid={`button-delete-shop-${shop.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                        삭제
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 가맹점 편집 다이얼로그 */}
      <Dialog open={!!editingShop} onOpenChange={(open) => !open && setEditingShop(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>가맹점 정보 수정</DialogTitle>
            <DialogDescription>
              {editingShop?.name}의 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">가맹점 이름</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">전화번호</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">주소</Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-hours">영업시간</Label>
              <Input
                id="edit-hours"
                value={editForm.businessHours}
                onChange={(e) => setEditForm({ ...editForm, businessHours: e.target.value })}
                placeholder="예: 09:00-18:00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-deposit">예약금</Label>
              <Input
                id="edit-deposit"
                type="number"
                value={editForm.depositAmount}
                onChange={(e) => setEditForm({ ...editForm, depositAmount: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-deposit-required">예약금 필수</Label>
              <Switch
                id="edit-deposit-required"
                checked={editForm.depositRequired}
                onCheckedChange={(checked) => setEditForm({ ...editForm, depositRequired: checked })}
              />
            </div>

            {/* 비밀번호 변경 섹션 */}
            <div className="border-t pt-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-password">비밀번호 변경 (선택사항)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="새 비밀번호 입력 (변경하지 않으려면 비워두세요)"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  비밀번호를 변경하려면 입력하세요. 비워두면 기존 비밀번호가 유지됩니다.
                </p>
              </div>
            </div>

            {/* 구독 관리 섹션 */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                구독 관리
              </h4>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-subscription-status">구독 상태</Label>
                  <select
                    id="edit-subscription-status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editForm.subscriptionStatus}
                    onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
                  >
                    <option value="none">미구독</option>
                    <option value="active">활성</option>
                    <option value="expired">만료</option>
                    <option value="cancelled">취소</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-subscription-tier">구독 플랜</Label>
                  <select
                    id="edit-subscription-tier"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editForm.subscriptionTier}
                    onChange={(e) => setEditForm({ ...editForm, subscriptionTier: e.target.value })}
                  >
                    <option value="basic">베이직 (29,000원/월)</option>
                    <option value="premium">프리미엄 (49,000원/월)</option>
                    <option value="enterprise">엔터프라이즈 (99,000원/월)</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-subscription-end">구독 만료일</Label>
                  <Input
                    id="edit-subscription-end"
                    type="date"
                    value={editForm.subscriptionEnd}
                    onChange={(e) => setEditForm({ ...editForm, subscriptionEnd: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingShop(null)}>취소</Button>
            <Button
              onClick={() => editingShop && editMutation.mutate({ shopId: editingShop.id, data: editForm })}
              disabled={editMutation.isPending}
            >
              {editMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 가맹점 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deletingShop} onOpenChange={(open) => !open && setDeletingShop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>가맹점 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-red-600">{deletingShop?.name}</span>을(를) 정말 삭제하시겠습니까?
              <br /><br />
              이 작업은 되돌릴 수 없으며, 해당 가맹점의 모든 데이터(예약, 고객, 서비스, 계정)가 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletingShop && deleteMutation.mutate(deletingShop.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
