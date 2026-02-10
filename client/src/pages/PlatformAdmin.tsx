import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2, Store, Check, X, Users, LogOut, Settings, Bell, UserCheck, Pencil, Trash2, Scissors, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

interface Shop {
  id: number;
  name: string;
  slug: string;
  phone: string;
  address: string;
  business_hours: string;
  deposit_amount: number;
  deposit_required: boolean;
  is_approved: boolean;
}

interface Service {
  id: number;
  shop_id: number;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  is_active: boolean;
}

export default function PlatformAdmin() {
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [deletingShop, setDeletingShop] = useState<Shop | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', business_hours: '', deposit_amount: 0, deposit_required: true, is_approved: false });

  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [addingService, setAddingService] = useState(false);
  const [serviceForm, setServiceForm] = useState({ shop_id: 0, name: '', description: '', duration: 60, price: 0, is_active: true });

  // ─── Shops ───
  const { data: shops, isLoading: isShopsLoading } = useQuery<Shop[]>({
    queryKey: ["admin-shops"],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.from("shops").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && user.role === "super_admin",
  });

  // ─── Services ───
  const { data: services, isLoading: isServicesLoading } = useQuery<Service[]>({
    queryKey: ["admin-services"],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.from("services").select("*").order("id");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && user.role === "super_admin",
  });

  // ─── Shop mutations ───
  const approveMutation = useMutation({
    mutationFn: async (id: number) => { if (!supabase) throw new Error("X"); const { error } = await supabase.from("shops").update({ is_approved: true }).eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-shops"] }); toast({ title: "승인 완료", description: "가맹점이 승인되었습니다." }); },
    onError: (e: Error) => toast({ title: "실패", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => { if (!supabase) throw new Error("X"); const { error } = await supabase.from("shops").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-shops"] }); toast({ title: "거절 완료" }); },
    onError: (e: Error) => toast({ title: "실패", description: e.message, variant: "destructive" }),
  });

  const editShopMutation = useMutation({
    mutationFn: async ({ shopId, data }: { shopId: number; data: typeof editForm }) => { if (!supabase) throw new Error("X"); const { error } = await supabase.from("shops").update(data).eq("id", shopId); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-shops"] }); toast({ title: "수정 완료" }); setEditingShop(null); },
    onError: (e: Error) => toast({ title: "수정 실패", description: e.message, variant: "destructive" }),
  });

  const deleteShopMutation = useMutation({
    mutationFn: async (id: number) => { if (!supabase) throw new Error("X"); const { error } = await supabase.from("shops").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-shops"] }); toast({ title: "삭제 완료" }); setDeletingShop(null); },
    onError: (e: Error) => toast({ title: "삭제 실패", description: e.message, variant: "destructive" }),
  });

  // ─── Service mutations ───
  const addServiceMutation = useMutation({
    mutationFn: async (f: typeof serviceForm) => { if (!supabase) throw new Error("X"); const { error } = await supabase.from("services").insert(f); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-services"] }); toast({ title: "서비스 추가 완료" }); setAddingService(false); },
    onError: (e: Error) => toast({ title: "추가 실패", description: e.message, variant: "destructive" }),
  });

  const editServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Service> }) => { if (!supabase) throw new Error("X"); const { error } = await supabase.from("services").update(data).eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-services"] }); toast({ title: "서비스 수정 완료" }); setEditingService(null); },
    onError: (e: Error) => toast({ title: "수정 실패", description: e.message, variant: "destructive" }),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => { if (!supabase) throw new Error("X"); const { error } = await supabase.from("services").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-services"] }); toast({ title: "서비스 삭제 완료" }); setDeletingService(null); },
    onError: (e: Error) => toast({ title: "삭제 실패", description: e.message, variant: "destructive" }),
  });

  const openEditShopModal = (shop: Shop) => {
    setEditForm({ name: shop.name, phone: shop.phone, address: shop.address, business_hours: shop.business_hours, deposit_amount: shop.deposit_amount, deposit_required: shop.deposit_required, is_approved: shop.is_approved });
    setEditingShop(shop);
  };
  const openEditServiceModal = (svc: Service) => {
    setServiceForm({ shop_id: svc.shop_id, name: svc.name, description: svc.description ?? '', duration: svc.duration, price: svc.price, is_active: svc.is_active });
    setEditingService(svc);
  };

  if (isAuthLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user || user.role !== 'super_admin') { setLocation("/login"); return null; }

  const pendingShops = shops?.filter(s => !s.is_approved) || [];
  const approvedShops = shops?.filter(s => s.is_approved) || [];
  const shopName = (id: number) => shops?.find(s => s.id === id)?.name ?? `#${id}`;

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center"><Settings className="w-5 h-5 text-white" /></div>
            <div><h1 className="font-bold text-lg">정리하개 플랫폼 관리</h1><p className="text-sm text-muted-foreground">총 관리자</p></div>
          </div>
          <Button variant="outline" onClick={() => logout()}><LogOut className="w-4 h-4 mr-2" />로그아웃</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card><CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2"><CardTitle className="text-sm font-medium">전체 가맹점</CardTitle><Store className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{shops?.length || 0}</div></CardContent></Card>
          <Link href="/admin/approvals"><Card className="hover-elevate cursor-pointer"><CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2"><CardTitle className="text-sm font-medium">계정 승인 관리</CardTitle><UserCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600 flex items-center gap-2"><Bell className="w-5 h-5" /><span>바로가기</span></div></CardContent></Card></Link>
          <Card><CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2"><CardTitle className="text-sm font-medium">전체 서비스</CardTitle><Scissors className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{services?.length || 0}</div></CardContent></Card>
        </div>

        <Tabs defaultValue="shops">
          <TabsList className="mb-6"><TabsTrigger value="shops">가맹점 관리</TabsTrigger><TabsTrigger value="services">서비스 관리</TabsTrigger></TabsList>

          <TabsContent value="shops">
            {pendingShops.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-orange-500" />승인 대기 ({pendingShops.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingShops.map(shop => (
                    <Card key={shop.id} className="border-orange-200">
                      <CardHeader><CardTitle className="text-lg">{shop.name}</CardTitle><CardDescription>/{shop.slug}</CardDescription></CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm mb-4">
                          <p><span className="text-muted-foreground">전화:</span> {shop.phone}</p>
                          <p><span className="text-muted-foreground">주소:</span> {shop.address}</p>
                          <p><span className="text-muted-foreground">예약금:</span> {shop.deposit_amount.toLocaleString()}원</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 gap-1" onClick={() => approveMutation.mutate(shop.id)} disabled={approveMutation.isPending}><Check className="w-4 h-4" />승인</Button>
                          <Button size="sm" variant="destructive" className="flex-1 gap-1" onClick={() => rejectMutation.mutate(shop.id)} disabled={rejectMutation.isPending}><X className="w-4 h-4" />거절</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Store className="w-5 h-5 text-primary" />운영 중인 가맹점 ({approvedShops.length})</h2>
              {isShopsLoading ? <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></div>
              : approvedShops.length === 0 ? <div className="text-center py-10 bg-white rounded-2xl border border-dashed"><p className="text-muted-foreground">등록된 가맹점이 없습니다</p></div>
              : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {approvedShops.map(shop => (
                    <Card key={shop.id}>
                      <CardHeader><div className="flex justify-between items-start"><div><CardTitle className="text-lg">{shop.name}</CardTitle><CardDescription>/{shop.slug}</CardDescription></div><Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">운영중</Badge></div></CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm mb-4">
                          <p><span className="text-muted-foreground">전화:</span> {shop.phone}</p>
                          <p><span className="text-muted-foreground">주소:</span> {shop.address}</p>
                          <p><span className="text-muted-foreground">영업시간:</span> {shop.business_hours}</p>
                          <p><span className="text-muted-foreground">예약금:</span> {shop.deposit_amount.toLocaleString()}원</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEditShopModal(shop)}><Pencil className="w-4 h-4" />편집</Button>
                          <Button size="sm" variant="destructive" className="flex-1 gap-1" onClick={() => setDeletingShop(shop)}><Trash2 className="w-4 h-4" />삭제</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>}
            </section>
          </TabsContent>

          <TabsContent value="services">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Scissors className="w-5 h-5 text-primary" />서비스 목록 ({services?.length || 0})</h2>
              <Button onClick={() => { setServiceForm({ shop_id: shops?.[0]?.id || 0, name: '', description: '', duration: 60, price: 0, is_active: true }); setAddingService(true); }} className="gap-1"><Plus className="w-4 h-4" />서비스 추가</Button>
            </div>
            {isServicesLoading ? <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></div>
            : !services?.length ? <div className="text-center py-10 bg-white rounded-2xl border border-dashed"><p className="text-muted-foreground">등록된 서비스가 없습니다</p></div>
            : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map(svc => (
                  <Card key={svc.id}>
                    <CardHeader><div className="flex justify-between items-start"><div><CardTitle className="text-lg">{svc.name}</CardTitle><CardDescription>{shopName(svc.shop_id)}</CardDescription></div><Badge variant={svc.is_active ? "outline" : "secondary"} className={svc.is_active ? "bg-green-50 text-green-700 border-green-200" : ""}>{svc.is_active ? "활성" : "비활성"}</Badge></div></CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm mb-4">
                        {svc.description && <p className="text-muted-foreground">{svc.description}</p>}
                        <p><span className="text-muted-foreground">소요시간:</span> {svc.duration}분</p>
                        <p><span className="text-muted-foreground">가격:</span> {svc.price.toLocaleString()}원</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEditServiceModal(svc)}><Pencil className="w-4 h-4" />편집</Button>
                        <Button size="sm" variant="destructive" className="flex-1 gap-1" onClick={() => setDeletingService(svc)}><Trash2 className="w-4 h-4" />삭제</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>}
          </TabsContent>
        </Tabs>
      </main>

      {/* 가맹점 편집 */}
      <Dialog open={!!editingShop} onOpenChange={(o) => !o && setEditingShop(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>가맹점 정보 수정</DialogTitle><DialogDescription>{editingShop?.name}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>이름</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div className="grid gap-2"><Label>전화번호</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
            <div className="grid gap-2"><Label>주소</Label><Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
            <div className="grid gap-2"><Label>영업시간</Label><Input value={editForm.business_hours} onChange={(e) => setEditForm({ ...editForm, business_hours: e.target.value })} /></div>
            <div className="grid gap-2"><Label>예약금</Label><Input type="number" value={editForm.deposit_amount} onChange={(e) => setEditForm({ ...editForm, deposit_amount: Number(e.target.value) })} /></div>
            <div className="flex items-center justify-between"><Label>예약금 필수</Label><Switch checked={editForm.deposit_required} onCheckedChange={(c) => setEditForm({ ...editForm, deposit_required: c })} /></div>
            <div className="flex items-center justify-between"><Label>승인 상태</Label><Switch checked={editForm.is_approved} onCheckedChange={(c) => setEditForm({ ...editForm, is_approved: c })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingShop(null)}>취소</Button>
            <Button onClick={() => editingShop && editShopMutation.mutate({ shopId: editingShop.id, data: editForm })} disabled={editShopMutation.isPending}>{editShopMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 가맹점 삭제 */}
      <AlertDialog open={!!deletingShop} onOpenChange={(o) => !o && setDeletingShop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>가맹점 삭제</AlertDialogTitle><AlertDialogDescription><span className="font-semibold text-red-600">{deletingShop?.name}</span>을(를) 정말 삭제하시겠습니까?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deletingShop && deleteShopMutation.mutate(deletingShop.id)} disabled={deleteShopMutation.isPending}>{deleteShopMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}삭제</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 서비스 추가/편집 */}
      <Dialog open={addingService || !!editingService} onOpenChange={(o) => { if (!o) { setAddingService(false); setEditingService(null); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editingService ? "서비스 수정" : "서비스 추가"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>소속 가맹점</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={serviceForm.shop_id} onChange={(e) => setServiceForm({ ...serviceForm, shop_id: Number(e.target.value) })}>
                <option value={0}>선택</option>
                {shops?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid gap-2"><Label>서비스 이름</Label><Input value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} /></div>
            <div className="grid gap-2"><Label>설명</Label><Input value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>소요시간 (분)</Label><Input type="number" value={serviceForm.duration} onChange={(e) => setServiceForm({ ...serviceForm, duration: Number(e.target.value) })} /></div>
              <div className="grid gap-2"><Label>가격 (원)</Label><Input type="number" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })} /></div>
            </div>
            <div className="flex items-center justify-between"><Label>활성</Label><Switch checked={serviceForm.is_active} onCheckedChange={(c) => setServiceForm({ ...serviceForm, is_active: c })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddingService(false); setEditingService(null); }}>취소</Button>
            <Button disabled={addServiceMutation.isPending || editServiceMutation.isPending} onClick={() => editingService ? editServiceMutation.mutate({ id: editingService.id, data: serviceForm }) : addServiceMutation.mutate(serviceForm)}>
              {(addServiceMutation.isPending || editServiceMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingService ? "저장" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 서비스 삭제 */}
      <AlertDialog open={!!deletingService} onOpenChange={(o) => !o && setDeletingService(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>서비스 삭제</AlertDialogTitle><AlertDialogDescription><span className="font-semibold text-red-600">{deletingService?.name}</span>을(를) 정말 삭제하시겠습니까?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deletingService && deleteServiceMutation.mutate(deletingService.id)} disabled={deleteServiceMutation.isPending}>{deleteServiceMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}삭제</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
