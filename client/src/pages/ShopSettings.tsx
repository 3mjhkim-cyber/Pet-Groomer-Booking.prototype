import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, Store, Save, Plus, Trash2, ArrowLeft, Calendar, Clock, FileText, X, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import type { Shop, Service } from "@shared/schema";
import { formatKoreanPhone } from "@/lib/phone";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// 차단된 시간대 타입: { "2026-02-03": ["10:00", "10:30"], ... }
type BlockedSlots = Record<string, string[]>;

// 요일별 영업시간 타입
type DaySchedule = {
  open: string;
  close: string;
  closed: boolean;
};

type BusinessDays = {
  mon: DaySchedule;
  tue: DaySchedule;
  wed: DaySchedule;
  thu: DaySchedule;
  fri: DaySchedule;
  sat: DaySchedule;
  sun: DaySchedule;
};

const DAY_LABELS: Record<keyof BusinessDays, string> = {
  mon: '월요일',
  tue: '화요일',
  wed: '수요일',
  thu: '목요일',
  fri: '금요일',
  sat: '토요일',
  sun: '일요일',
};

const DEFAULT_SCHEDULE: DaySchedule = { open: '09:00', close: '18:00', closed: false };

const getDefaultBusinessDays = (): BusinessDays => ({
  mon: { ...DEFAULT_SCHEDULE },
  tue: { ...DEFAULT_SCHEDULE },
  wed: { ...DEFAULT_SCHEDULE },
  thu: { ...DEFAULT_SCHEDULE },
  fri: { ...DEFAULT_SCHEDULE },
  sat: { ...DEFAULT_SCHEDULE },
  sun: { open: '09:00', close: '18:00', closed: true },
});

export default function ShopSettings() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shop, isLoading: isShopLoading } = useQuery<Shop>({
    queryKey: ['/api/shop/settings'],
    queryFn: async () => {
      const res = await fetch('/api/shop/settings');
      if (!res.ok) throw new Error("Failed to fetch shop settings");
      return res.json();
    },
    enabled: !!user && user.role === 'shop_owner',
  });

  const { data: services, isLoading: isServicesLoading } = useQuery<Service[]>({
    queryKey: ['/api/shop/services'],
    queryFn: async () => {
      const res = await fetch('/api/shop/services');
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
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

  // 요일별 영업시간 상태
  const [businessDays, setBusinessDays] = useState<BusinessDays>(getDefaultBusinessDays());

  // 임시 휴무일 상태
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [newClosedDate, setNewClosedDate] = useState('');

  // 가게 메모 상태
  const [shopMemo, setShopMemo] = useState('');

  // 시간대 차단 상태
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlots>({});
  const [forceOpenSlots, setForceOpenSlots] = useState<BlockedSlots>({});
  const [blockDate, setBlockDate] = useState('');

  const [newService, setNewService] = useState({ name: '', description: '', duration: '' as string | number, price: '' as string | number });

  // 비밀번호 변경 상태
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

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

      // 요일별 영업시간 파싱
      if (shop.businessDays) {
        try {
          const parsed = JSON.parse(shop.businessDays);
          setBusinessDays({ ...getDefaultBusinessDays(), ...parsed });
        } catch {
          setBusinessDays(getDefaultBusinessDays());
        }
      }

      // 임시 휴무일 파싱
      if (shop.closedDates) {
        try {
          const parsed = JSON.parse(shop.closedDates);
          setClosedDates(Array.isArray(parsed) ? parsed : []);
        } catch {
          setClosedDates([]);
        }
      }

      // 가게 메모
      setShopMemo(shop.shopMemo || '');

      // 차단된 시간대 파싱
      if (shop.blockedSlots) {
        try {
          const parsed = JSON.parse(shop.blockedSlots);
          setBlockedSlots(typeof parsed === 'object' && parsed !== null ? parsed : {});
        } catch {
          setBlockedSlots({});
        }
      }

      // 강제 오픈 시간대 파싱
      if (shop.forceOpenSlots) {
        try {
          const parsed = JSON.parse(shop.forceOpenSlots);
          setForceOpenSlots(typeof parsed === 'object' && parsed !== null ? parsed : {});
        } catch {
          setForceOpenSlots({});
        }
      }
    }
  }, [shop]);

  const handleNumberInput = (value: string): string | number => {
    if (value === '') return '';
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return '';
    return num;
  };

  const updateShopMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
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

  // 요일별 영업시간 업데이트 함수
  const updateDaySchedule = (day: keyof BusinessDays, field: keyof DaySchedule, value: string | boolean) => {
    setBusinessDays(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  // 요일별 영업시간 저장
  const saveBusinessDays = () => {
    updateShopMutation.mutate({ businessDays: JSON.stringify(businessDays) });
  };

  // 휴무일 추가
  const addClosedDate = () => {
    if (!newClosedDate) return;
    if (closedDates.includes(newClosedDate)) {
      toast({ title: "중복된 날짜", description: "이미 등록된 휴무일입니다.", variant: "destructive" });
      return;
    }
    const updatedDates = [...closedDates, newClosedDate].sort();
    setClosedDates(updatedDates);
    setNewClosedDate('');
    updateShopMutation.mutate({ closedDates: JSON.stringify(updatedDates) });
  };

  // 휴무일 삭제
  const removeClosedDate = (dateToRemove: string) => {
    const updatedDates = closedDates.filter(d => d !== dateToRemove);
    setClosedDates(updatedDates);
    updateShopMutation.mutate({ closedDates: JSON.stringify(updatedDates) });
  };

  // 가게 메모 저장
  const saveShopMemo = () => {
    updateShopMutation.mutate({ shopMemo });
  };

  // 선택된 날짜의 시간대 슬롯 생성 (영업시간 기반)
  const getTimeSlotsForDate = (dateStr: string): string[] => {
    if (!dateStr) return [];
    const [year, month, day] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    const dayKeys: (keyof BusinessDays)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayKey = dayKeys[dayOfWeek];

    let sH = 9, sM = 0, eH = 18, eM = 0;

    const daySchedule = businessDays[dayKey];
    if (daySchedule) {
      if (daySchedule.closed) return [];
      const [oh, om] = daySchedule.open.split(':').map(Number);
      const [ch, cm] = daySchedule.close.split(':').map(Number);
      sH = oh; sM = om || 0; eH = ch; eM = cm || 0;
    }

    const slots: string[] = [];
    const start = sH * 60 + sM;
    const end = eH * 60 + eM;
    for (let m = start; m < end; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
    return slots;
  };

  const blockDateSlots = useMemo(() => getTimeSlotsForDate(blockDate), [blockDate, businessDays]);
  const blockedForDate = blockedSlots[blockDate] || [];
  const forceOpenForDate = forceOpenSlots[blockDate] || [];

  // 선택된 날짜의 예약 상태 조회 (공개 available-times API 사용)
  const { data: availableTimesForDate } = useQuery<{ time: string; available: boolean; reason?: string }[]>({
    queryKey: [`/api/shops/${shop?.slug}/available-times/${blockDate}`],
    enabled: !!blockDate && !!shop?.slug,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // 예약으로 인해 점유된 시간대 계산 (reason이 '예약 불가'인 슬롯)
  const bookedTimeSet = useMemo(() => {
    const set = new Set<string>();
    if (!availableTimesForDate) return set;
    for (const slot of availableTimesForDate) {
      if (!slot.available && slot.reason === '예약 불가') {
        set.add(slot.time);
      }
    }
    return set;
  }, [availableTimesForDate]);

  // 시간대 차단/해제 토글 (빈 시간대용)
  const toggleBlockSlot = (slot: string) => {
    const current = blockedSlots[blockDate] || [];
    let updated: string[];
    if (current.includes(slot)) {
      updated = current.filter(s => s !== slot);
    } else {
      updated = [...current, slot].sort();
    }

    const newBlockedSlots = { ...blockedSlots };
    if (updated.length === 0) {
      delete newBlockedSlots[blockDate];
    } else {
      newBlockedSlots[blockDate] = updated;
    }
    setBlockedSlots(newBlockedSlots);
    updateShopMutation.mutate({ blockedSlots: JSON.stringify(newBlockedSlots) });
  };

  // 예약된 시간대 강제 오픈/잠금 토글
  const toggleForceOpen = (slot: string) => {
    const current = forceOpenSlots[blockDate] || [];
    let updated: string[];
    if (current.includes(slot)) {
      updated = current.filter(s => s !== slot);
    } else {
      updated = [...current, slot].sort();
    }

    const newForceOpen = { ...forceOpenSlots };
    if (updated.length === 0) {
      delete newForceOpen[blockDate];
    } else {
      newForceOpen[blockDate] = updated;
    }
    setForceOpenSlots(newForceOpen);
    updateShopMutation.mutate({ forceOpenSlots: JSON.stringify(newForceOpen) });
  };

  // 해당 날짜의 모든 차단/강제오픈 해제
  const clearBlockedDate = (dateStr: string) => {
    const newBlockedSlots = { ...blockedSlots };
    delete newBlockedSlots[dateStr];
    setBlockedSlots(newBlockedSlots);

    const newForceOpen = { ...forceOpenSlots };
    delete newForceOpen[dateStr];
    setForceOpenSlots(newForceOpen);

    updateShopMutation.mutate({
      blockedSlots: JSON.stringify(newBlockedSlots),
      forceOpenSlots: JSON.stringify(newForceOpen),
    });
  };

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
      setNewService({ name: '', description: '', duration: '', price: '' });
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

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "비밀번호 변경 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({ title: "변경 완료", description: "비밀번호가 변경되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "변경 실패", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!isAuthLoading && (!user || user.role !== 'shop_owner')) {
      setLocation("/login");
    }
  }, [isAuthLoading, user, setLocation]);

  useEffect(() => {
    if (user?.shop && (user.shop as any).subscriptionStatus !== 'active') {
      setLocation("/admin/subscription");
    }
  }, [user, setLocation]);

  if (isAuthLoading || isShopLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user || user.role !== 'shop_owner') {
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
    addServiceMutation.mutate({
      name: newService.name,
      description: newService.description || '',
      duration,
      price
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({ title: "입력 오류", description: "모든 필드를 입력해주세요.", variant: "destructive" });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "입력 오류", description: "새 비밀번호가 일치하지 않습니다.", variant: "destructive" });
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,}$/;
    if (!passwordRegex.test(passwordForm.newPassword)) {
      toast({
        title: "비밀번호 형식 오류",
        description: "비밀번호는 영문 대문자, 소문자, 숫자, 특수문자를 포함하여 10자 이상이어야 합니다.",
        variant: "destructive"
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
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
        {/* 구독 상태 카드 */}
        <Card className={shop?.subscriptionStatus === 'active' ? 'border-green-200 bg-green-50/50' : 'border-orange-200 bg-orange-50/50'}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>구독 상태</span>
              <Badge variant={shop?.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                {shop?.subscriptionStatus === 'active' ? '활성' :
                 shop?.subscriptionStatus === 'expired' ? '만료' :
                 shop?.subscriptionStatus === 'cancelled' ? '취소됨' : '미구독'}
              </Badge>
            </CardTitle>
            <CardDescription>
              {shop?.subscriptionStatus === 'active'
                ? `${shop.subscriptionTier === 'basic' ? '베이직' : shop.subscriptionTier === 'premium' ? '프리미엄' : '엔터프라이즈'} 플랜 이용 중`
                : '구독을 활성화하여 서비스를 이용하세요'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation('/admin/subscription')}
              variant={shop?.subscriptionStatus === 'active' ? 'outline' : 'default'}
            >
              {shop?.subscriptionStatus === 'active' ? '구독 관리' : '구독하기'}
            </Button>
            {shop?.subscriptionStatus === 'active' && shop.subscriptionEnd && (
              <p className="text-sm text-muted-foreground mt-2">
                만료일: {new Date(shop.subscriptionEnd).toLocaleDateString('ko-KR')}
              </p>
            )}
          </CardContent>
        </Card>

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

        {/* 요일별 영업시간 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              요일별 영업시간
            </CardTitle>
            <CardDescription>각 요일마다 영업시간을 다르게 설정하거나 휴무일로 지정할 수 있습니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(Object.keys(DAY_LABELS) as Array<keyof BusinessDays>).map(day => (
              <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 sm:w-16 font-medium">{DAY_LABELS[day]}</div>
                  <Switch
                    checked={!businessDays[day].closed}
                    onCheckedChange={(checked) => updateDaySchedule(day, 'closed', !checked)}
                    data-testid={`switch-${day}`}
                  />
                  {businessDays[day].closed && (
                    <Badge variant="secondary" className="text-muted-foreground">휴무</Badge>
                  )}
                </div>
                {!businessDays[day].closed && (
                  <div className="flex items-center gap-2 ml-0 sm:ml-0">
                    <Input
                      type="time"
                      value={businessDays[day].open}
                      onChange={(e) => updateDaySchedule(day, 'open', e.target.value)}
                      className="w-[120px] sm:w-32"
                      data-testid={`input-${day}-open`}
                    />
                    <span className="text-muted-foreground">~</span>
                    <Input
                      type="time"
                      value={businessDays[day].close}
                      onChange={(e) => updateDaySchedule(day, 'close', e.target.value)}
                      className="w-[120px] sm:w-32"
                      data-testid={`input-${day}-close`}
                    />
                  </div>
                )}
              </div>
            ))}
            <Button onClick={saveBusinessDays} disabled={updateShopMutation.isPending} data-testid="button-save-business-days">
              <Save className="w-4 h-4 mr-2" />
              영업시간 저장
            </Button>
          </CardContent>
        </Card>

        {/* 임시 휴무일 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              임시 휴무일
            </CardTitle>
            <CardDescription>명절, 휴가 등 특정 날짜에 가게를 쉬는 경우 등록하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input
                type="date"
                value={newClosedDate}
                onChange={(e) => setNewClosedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-auto min-w-[150px] flex-shrink-0"
                data-testid="input-new-closed-date"
              />
              <Button onClick={addClosedDate} disabled={!newClosedDate || updateShopMutation.isPending} data-testid="button-add-closed-date">
                <Plus className="w-4 h-4 mr-1" />
                추가
              </Button>
            </div>

            {closedDates.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {closedDates.map(date => {
                  const dateObj = new Date(date + 'T00:00:00');
                  const isPast = dateObj < new Date(new Date().toDateString());
                  return (
                    <Badge
                      key={date}
                      variant={isPast ? "secondary" : "outline"}
                      className={`flex items-center gap-1 px-3 py-1.5 ${isPast ? 'opacity-50' : ''}`}
                    >
                      {format(dateObj, 'M월 d일 (EEE)', { locale: ko })}
                      <button
                        onClick={() => removeClosedDate(date)}
                        className="ml-1 hover:text-destructive"
                        data-testid={`button-remove-date-${date}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">등록된 임시 휴무일이 없습니다</p>
            )}
          </CardContent>
        </Card>

        {/* 시간대 차단 관리 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              시간대 차단 관리
            </CardTitle>
            <CardDescription>특정 날짜의 시간대를 수동으로 차단/해제하고, 예약된 시간대를 강제로 열 수 있습니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1">
                <Label>날짜 선택</Label>
                <Input
                  type="date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-auto min-w-[150px]"
                />
              </div>
            </div>

            {blockDate && blockDateSlots.length === 0 && (
              <p className="text-sm text-muted-foreground">해당 날짜는 휴무일입니다.</p>
            )}

            {blockDate && blockDateSlots.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" /> 예약 가능</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" /> 예약됨</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" /> 수동 차단</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" /> 강제 오픈</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  빈 시간대 클릭 → 차단/해제 | 예약된 시간대 클릭 → 강제 오픈/잠금
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {blockDateSlots.map(slot => {
                    const isBooked = bookedTimeSet.has(slot);
                    const isBlocked = blockedForDate.includes(slot);
                    const isForceOpen = forceOpenForDate.includes(slot);

                    let className = '';
                    let label = slot;
                    if (isBlocked) {
                      className = 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200';
                    } else if (isBooked && isForceOpen) {
                      className = 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200';
                    } else if (isBooked) {
                      className = 'bg-blue-100 text-blue-600 border-blue-300 hover:bg-blue-200';
                    } else {
                      className = 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
                    }

                    const handleClick = () => {
                      if (isBooked) {
                        toggleForceOpen(slot);
                      } else {
                        toggleBlockSlot(slot);
                      }
                    };

                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={handleClick}
                        disabled={updateShopMutation.isPending}
                        className={`px-2 py-2 rounded-lg text-sm font-medium border transition-colors ${className}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 설정된 날짜 목록 */}
            {(Object.keys(blockedSlots).length > 0 || Object.keys(forceOpenSlots).length > 0) && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground">설정된 날짜:</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set([...Object.keys(blockedSlots), ...Object.keys(forceOpenSlots)]))
                    .sort()
                    .map(dateStr => {
                      const dateObj = new Date(dateStr + 'T00:00:00');
                      const bCount = (blockedSlots[dateStr] || []).length;
                      const fCount = (forceOpenSlots[dateStr] || []).length;
                      const parts: string[] = [];
                      if (bCount > 0) parts.push(`차단 ${bCount}`);
                      if (fCount > 0) parts.push(`오픈 ${fCount}`);
                      return (
                        <Badge
                          key={dateStr}
                          variant="outline"
                          className="flex items-center gap-1 px-3 py-1.5 cursor-pointer hover:bg-secondary/50"
                          onClick={() => setBlockDate(dateStr)}
                        >
                          {format(dateObj, 'M월 d일 (EEE)', { locale: ko })} - {parts.join(', ')}
                          <button
                            onClick={(e) => { e.stopPropagation(); clearBlockedDate(dateStr); }}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 가게 소개/메모 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              가게 소개 및 안내
            </CardTitle>
            <CardDescription>주차 안내, 찾아오는 길, 공지사항 등을 작성하세요. 예약 페이지에 표시됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={shopMemo}
              onChange={(e) => setShopMemo(e.target.value)}
              placeholder="예: 주차는 건물 지하 1층에서 가능합니다.&#10;설날 연휴 (1/27~1/30) 휴무입니다.&#10;반려동물 건강 상태에 따라 미용이 어려울 수 있습니다."
              rows={5}
              className="resize-none"
              data-testid="textarea-shop-memo"
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{shopMemo.length}/500자</p>
              <Button onClick={saveShopMemo} disabled={updateShopMutation.isPending} data-testid="button-save-shop-memo">
                <Save className="w-4 h-4 mr-2" />
                저장
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 비밀번호 변경 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              비밀번호 변경
            </CardTitle>
            <CardDescription>로그인 비밀번호를 변경합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="current-password">현재 비밀번호</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="현재 비밀번호를 입력하세요"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-password">새 비밀번호</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="새 비밀번호를 입력하세요"
                />
                <p className="text-xs text-muted-foreground">
                  영문 대문자, 소문자, 숫자, 특수문자를 포함하여 10자 이상
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="새 비밀번호를 다시 입력하세요"
                />
              </div>
              <Button type="submit" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                비밀번호 변경
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>서비스 관리</CardTitle>
            <CardDescription>제공하는 미용 서비스를 관리합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddService} className="space-y-3 mb-6 p-4 bg-secondary/20 rounded-lg">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Input
                  placeholder="서비스명"
                  value={newService.name}
                  onChange={e => setNewService(s => ({...s, name: e.target.value}))}
                  className="col-span-2 sm:col-span-1"
                  data-testid="input-new-service-name"
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="시간(분)"
                  value={newService.duration}
                  onChange={e => setNewService(s => ({...s, duration: handleNumberInput(e.target.value)}))}
                  data-testid="input-new-service-duration"
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="가격"
                  value={newService.price}
                  onChange={e => setNewService(s => ({...s, price: handleNumberInput(e.target.value)}))}
                  data-testid="input-new-service-price"
                />
              </div>
              <Input
                placeholder="서비스 설명 (선택사항)"
                value={newService.description}
                onChange={e => setNewService(s => ({...s, description: e.target.value}))}
                className="w-full"
                data-testid="input-new-service-description"
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
                  <div key={service.id} className="p-3 bg-secondary/30 rounded-lg" data-testid={`service-item-${service.id}`}>
                    <div className="flex items-center justify-between">
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
                    {service.description && (
                      <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                    )}
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
