import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, Store, Save, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import type { Shop, Service } from "@shared/schema";
import { formatKoreanPhone } from "@/lib/phone";

export default function ShopSettings() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shop, isLoading: isShopLoading } = useQuery<Shop>({
    queryKey: ['/api/shop/settings'],
    enabled: !!user && user.role === 'shop_owner',
  });

  const { data: services, isLoading: isServicesLoading } = useQuery<Service[]>({
    queryKey: ['/api/shop/services'],
    enabled: !!user && user.role === 'shop_owner',
  });

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    businessHours: '',
    depositAmount: '' as string | number,
    depositRequired: true,
  });

  const [newService, setNewService] = useState({ name: '', duration: '' as string | number, price: '' as string | number });

  useEffect(() => {
    if (shop) {
      setFormData({
        name: shop.name,
        phone: shop.phone,
        address: shop.address,
        businessHours: shop.businessHours,
        depositAmount: shop.depositAmount || '',
        depositRequired: shop.depositRequired,
      });
    }
  }, [shop]);

  const handleNumberInput = (value: string): string | number => {
    if (value === '') return '';
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return '';
    return num;
  };

  const updateShopMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/shop/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update shop");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shop/settings'] });
      toast({ title: "저장 완료", description: "설정이 저장되었습니다." });
    },
  });

  const addServiceMutation = useMutation({
    mutationFn: async (data: typeof newService) => {
      const res = await fetch('/api/shop/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add service");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shop/services'] });
      setNewService({ name: '', duration: '', price: '' });
      toast({ title: "추가 완료", description: "서비스가 추가되었습니다." });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/shop/services/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete service");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shop/services'] });
      toast({ title: "삭제 완료", description: "서비스가 삭제되었습니다." });
    },
  });

  if (isAuthLoading || isShopLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user || user.role !== 'shop_owner') {
    setLocation("/login");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateShopMutation.mutate(formData);
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name) return;
    const duration = typeof newService.duration === 'string' ? parseInt(newService.duration, 10) || 0 : newService.duration;
    const price = typeof newService.price === 'string' ? parseInt(newService.price, 10) || 0 : newService.price;
    if (duration <= 0 || price <= 0) {
      toast({ title: "입력 오류", description: "시간과 가격을 올바르게 입력해주세요.", variant: "destructive" });
      return;
    }
    addServiceMutation.mutate({ name: newService.name, duration, price });
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/dashboard')} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">가게 설정</h1>
              <p className="text-sm text-muted-foreground">{shop?.name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>가게의 기본 정보를 설정합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">가게 이름</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={e => setFormData(f => ({...f, name: e.target.value}))}
                    data-testid="input-shop-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">전화번호</Label>
                  <Input 
                    id="phone" 
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(f => ({...f, phone: formatKoreanPhone(e.target.value)}))}
                    placeholder="010-0000-0000"
                    data-testid="input-shop-phone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">주소</Label>
                <Input 
                  id="address" 
                  value={formData.address}
                  onChange={e => setFormData(f => ({...f, address: e.target.value}))}
                  data-testid="input-shop-address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours">영업시간</Label>
                <Input 
                  id="hours" 
                  value={formData.businessHours}
                  onChange={e => setFormData(f => ({...f, businessHours: e.target.value}))}
                  placeholder="예: 09:00-18:00"
                  data-testid="input-shop-hours"
                />
              </div>
              <Button type="submit" disabled={updateShopMutation.isPending} data-testid="button-save-shop">
                <Save className="w-4 h-4 mr-2" />
                저장
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>예약금 설정</CardTitle>
            <CardDescription>예약금 요구 여부와 금액을 설정합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>예약금 요구</Label>
                <p className="text-sm text-muted-foreground">예약 확정 시 예약금을 요청합니다</p>
              </div>
              <Switch 
                checked={formData.depositRequired}
                onCheckedChange={v => setFormData(f => ({...f, depositRequired: v}))}
                data-testid="switch-deposit-required"
              />
            </div>
            {formData.depositRequired && (
              <div className="space-y-2">
                <Label htmlFor="depositAmount">예약금 금액</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="depositAmount"
                    type="number"
                    min="0"
                    value={formData.depositAmount}
                    onChange={e => setFormData(f => ({...f, depositAmount: handleNumberInput(e.target.value)}))}
                    className="w-32"
                    placeholder="금액 입력"
                    data-testid="input-deposit-amount"
                  />
                  <span className="text-muted-foreground">원</span>
                </div>
              </div>
            )}
            <Button onClick={() => updateShopMutation.mutate(formData)} disabled={updateShopMutation.isPending} data-testid="button-save-deposit">
              <Save className="w-4 h-4 mr-2" />
              저장
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>서비스 관리</CardTitle>
            <CardDescription>제공하는 미용 서비스를 관리합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddService} className="flex gap-2 mb-4 flex-wrap">
              <Input 
                placeholder="서비스명"
                value={newService.name}
                onChange={e => setNewService(s => ({...s, name: e.target.value}))}
                className="w-40"
                data-testid="input-new-service-name"
              />
              <Input 
                type="number"
                min="0"
                placeholder="시간(분)"
                value={newService.duration}
                onChange={e => setNewService(s => ({...s, duration: handleNumberInput(e.target.value)}))}
                className="w-24"
                data-testid="input-new-service-duration"
              />
              <Input 
                type="number"
                min="0"
                placeholder="가격"
                value={newService.price}
                onChange={e => setNewService(s => ({...s, price: handleNumberInput(e.target.value)}))}
                className="w-28"
                data-testid="input-new-service-price"
              />
              <Button type="submit" disabled={addServiceMutation.isPending} data-testid="button-add-service">
                <Plus className="w-4 h-4 mr-1" />
                추가
              </Button>
            </form>

            {isServicesLoading ? (
              <div className="text-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              </div>
            ) : services && services.length > 0 ? (
              <div className="space-y-2">
                {services.filter(s => s.isActive).map(service => (
                  <div key={service.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg" data-testid={`service-item-${service.id}`}>
                    <div>
                      <span className="font-medium">{service.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {service.duration}분 / {service.price.toLocaleString()}원
                      </span>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => deleteServiceMutation.mutate(service.id)}
                      disabled={deleteServiceMutation.isPending}
                      data-testid={`button-delete-service-${service.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">등록된 서비스가 없습니다</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
