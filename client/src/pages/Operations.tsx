import { useAuth } from "@/hooks/use-auth";
import { useIsSubscriptionAccessible } from "@/hooks/use-subscription";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Loader2, Store, Save, Plus, Trash2, ArrowLeft, Calendar, Clock,
  FileText, X, ChevronRight, Bell, CreditCard, ChevronDown, ChevronUp,
  Scissors, Ban,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

// --- Types ---
type BlockedSlots = Record<string, string[]>;
type DaySchedule = { open: string; close: string; closed: boolean };
type BusinessDays = {
  mon: DaySchedule; tue: DaySchedule; wed: DaySchedule; thu: DaySchedule;
  fri: DaySchedule; sat: DaySchedule; sun: DaySchedule;
};
// 카카오 알림톡 고정 템플릿 – 활성화 여부만 관리
type KakaoTemplateKey = 'bookingConfirmed' | 'depositGuide' | 'reminderBefore' | 'bookingCancelled' | 'returnVisit';
type NotifEnabled = Partial<Record<KakaoTemplateKey, boolean>>;

// --- Constants ---
const DAY_LABELS: Record<keyof BusinessDays, string> = {
  mon: '월요일', tue: '화요일', wed: '수요일', thu: '목요일',
  fri: '금요일', sat: '토요일', sun: '일요일',
};

const DEFAULT_SCHEDULE: DaySchedule = { open: '09:00', close: '18:00', closed: false };

const getDefaultBusinessDays = (): BusinessDays => ({
  mon: { ...DEFAULT_SCHEDULE }, tue: { ...DEFAULT_SCHEDULE },
  wed: { ...DEFAULT_SCHEDULE }, thu: { ...DEFAULT_SCHEDULE },
  fri: { ...DEFAULT_SCHEDULE }, sat: { ...DEFAULT_SCHEDULE },
  sun: { open: '09:00', close: '18:00', closed: true },
});

// 카카오 알림톡 고정 템플릿 목록 (서버와 동일한 양식 유지)
const KAKAO_TEMPLATE_TYPES: { key: KakaoTemplateKey; label: string; description: string; template: string }[] = [
  {
    key: 'bookingConfirmed',
    label: '예약 확정',
    description: '예약이 확정되면 고객에게 발송합니다.',
    template: `[#{매장명}]\n#{고객명}님의 예약이 확정되었습니다.\n예약일시: #{예약일시}\n반려동물: #{반려동물이름}\n문의: #{매장전화번호}`,
  },
  {
    key: 'depositGuide',
    label: '예약금 안내',
    description: '예약금 입금을 안내할 때 발송합니다.',
    template: `[#{매장명}]\n#{고객명}님의 예약이 접수되었습니다.\n예약금: #{예약금}원\n입금계좌: #{계좌번호}\n예약일시: #{예약일시}\n반려동물: #{반려동물이름}\n문의: #{매장전화번호}`,
  },
  {
    key: 'reminderBefore',
    label: '방문 전 리마인드',
    description: '방문 전날 자동으로 발송합니다.',
    template: `[#{매장명}]\n#{고객명}님 방문 예정 예약이 있습니다.\n예약일시: #{예약일시}\n반려동물: #{반려동물이름}\n문의: #{매장전화번호}`,
  },
  {
    key: 'bookingCancelled',
    label: '예약 취소',
    description: '예약이 취소될 때 고객에게 발송합니다.',
    template: `[#{매장명}]\n#{고객명}님의 예약이 취소되었습니다.\n예약일시: #{예약일시}\n반려동물: #{반려동물이름}\n문의: #{매장전화번호}`,
  },
  {
    key: 'returnVisit',
    label: '재방문 안내',
    description: '마지막 방문 후 일정 기간이 지난 고객에게 발송합니다.',
    template: `[#{매장명}]\n#{고객명}님, 오랜만이에요!\n#{반려동물이름}의 미용 예약 어떠세요?\n문의: #{매장전화번호}`,
  },
];

// 미리보기용 샘플 치환
function previewKakaoTemplate(template: string, shopName: string, phone: string, depositAmount: string, bankAccount: string, extraNote: string): string {
  const values: Record<string, string> = {
    '#{매장명}': shopName || '내 매장',
    '#{고객명}': '홍길동',
    '#{반려동물이름}': '몽이',
    '#{예약일시}': '4월 1일 오후 2:00',
    '#{예약금}': depositAmount || '10,000',
    '#{계좌번호}': bankAccount || '(계좌번호 미설정)',
    '#{매장전화번호}': phone || '010-0000-0000',
  };
  let result = template;
  for (const [k, v] of Object.entries(values)) result = result.split(k).join(v);
  if (extraNote.trim()) result += `\n${extraNote.trim()}`;
  return result;
}

const SECTIONS = [
  { id: 'info',          label: '기본정보',    icon: Store },
  { id: 'hours',         label: '영업시간',    icon: Clock },
  { id: 'holidays',      label: '휴무일',      icon: Calendar },
  { id: 'blocked',       label: '시간대 차단', icon: Ban },
  { id: 'services',      label: '서비스 관리', icon: Scissors },
  { id: 'deposit',       label: '예약금 설정', icon: CreditCard },
  { id: 'notifications', label: '알림 설정',   icon: Bell },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

// --- Main Component ---
export default function Operations() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { userAccessible, isLoading: isSubLoading } = useIsSubscriptionAccessible();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Tab state (local — simulates page navigation on mobile)
  const [activeTab, setActiveTab] = useState<SectionId | ''>('');
  const effectiveTab: SectionId | '' = activeTab || (isMobile ? '' : 'info');

  // --- Queries ---
  const { data: shop, isLoading: isShopLoading } = useQuery<Shop>({
    queryKey: ['/api/shop/settings'],
    queryFn: async () => {
      const res = await fetch('/api/shop/settings');
      if (!res.ok) throw new Error('Failed to fetch shop settings');
      return res.json();
    },
    enabled: !!user && user.role === 'shop_owner',
  });

  const { data: services, isLoading: isServicesLoading } = useQuery<Service[]>({
    queryKey: ['/api/shop/services'],
    queryFn: async () => {
      const res = await fetch('/api/shop/services');
      if (!res.ok) throw new Error('Failed to fetch services');
      return res.json();
    },
    enabled: !!user && user.role === 'shop_owner',
  });

  // --- State ---
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [shopMemo, setShopMemo] = useState('');
  const [businessDays, setBusinessDays] = useState<BusinessDays>(getDefaultBusinessDays());
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [newClosedDate, setNewClosedDate] = useState('');
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlots>({});
  const [forceOpenSlots, setForceOpenSlots] = useState<BlockedSlots>({});
  const [blockDate, setBlockDate] = useState('');
  const [depositAmount, setDepositAmount] = useState<string | number>('');
  const [depositRequired, setDepositRequired] = useState(true);
  const [newService, setNewService] = useState({
    name: '', description: '',
    duration: '' as string | number,
    price: '' as string | number,
  });
  const [notifEnabled, setNotifEnabled] = useState<NotifEnabled>({});
  const [bankAccount, setBankAccount] = useState('');
  const [notifExtraNote, setNotifExtraNote] = useState('');
  const [expandedNotif, setExpandedNotif] = useState<KakaoTemplateKey | null>(null);

  // --- Hydrate from shop data ---
  useEffect(() => {
    if (!shop) return;
    setFormData({ name: shop.name, phone: shop.phone, address: shop.address });
    setShopMemo(shop.shopMemo || '');
    setDepositAmount(shop.depositAmount || '');
    setDepositRequired(shop.depositRequired);

    if (shop.businessDays) {
      try { setBusinessDays({ ...getDefaultBusinessDays(), ...JSON.parse(shop.businessDays) }); }
      catch { setBusinessDays(getDefaultBusinessDays()); }
    }
    if (shop.closedDates) {
      try { const p = JSON.parse(shop.closedDates); setClosedDates(Array.isArray(p) ? p : []); }
      catch { setClosedDates([]); }
    }
    if (shop.blockedSlots) {
      try { const p = JSON.parse(shop.blockedSlots); setBlockedSlots(typeof p === 'object' && p ? p : {}); }
      catch { setBlockedSlots({}); }
    }
    if (shop.forceOpenSlots) {
      try { const p = JSON.parse(shop.forceOpenSlots); setForceOpenSlots(typeof p === 'object' && p ? p : {}); }
      catch { setForceOpenSlots({}); }
    }
    if ((shop as any).notificationEnabled) {
      try { setNotifEnabled(JSON.parse((shop as any).notificationEnabled)); }
      catch {}
    }
    if ((shop as any).bankAccount) setBankAccount((shop as any).bankAccount);
    if ((shop as any).notificationExtraNote) setNotifExtraNote((shop as any).notificationExtraNote);
  }, [shop]);

  // --- Auth / subscription guards ---
  useEffect(() => {
    if (!isAuthLoading && (!user || user.role !== 'shop_owner')) setLocation('/login');
  }, [isAuthLoading, user, setLocation]);

  useEffect(() => {
    if (!isSubLoading && user?.role === 'shop_owner') {
      const s = user.shop as any;
      const shopAccessible = s?.subscriptionStatus === 'active' ||
        (s?.subscriptionStatus === 'cancelled' && s?.subscriptionEnd && new Date(s.subscriptionEnd) > new Date());
      if (!shopAccessible && !userAccessible) setLocation('/admin/subscription');
    }
  }, [user, userAccessible, isSubLoading, setLocation]);

  // --- Mutations ---
  const updateShopMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch('/api/shop/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update shop');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shop/settings'] });
      toast({ title: '저장 완료', description: '설정이 저장되었습니다.' });
    },
  });

  const addServiceMutation = useMutation({
    mutationFn: async (data: typeof newService) => {
      const res = await fetch('/api/shop/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add service');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shop/services'] });
      setNewService({ name: '', description: '', duration: '', price: '' });
      toast({ title: '추가 완료', description: '서비스가 추가되었습니다.' });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/shop/services/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete service');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shop/services'] });
      toast({ title: '삭제 완료', description: '서비스가 삭제되었습니다.' });
    },
  });

  // --- Helpers ---
  const handleNumberInput = (value: string): string | number => {
    if (value === '') return '';
    const num = parseInt(value, 10);
    return (isNaN(num) || num < 0) ? '' : num;
  };

  const updateDaySchedule = (day: keyof BusinessDays, field: keyof DaySchedule, value: string | boolean) => {
    setBusinessDays(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const addClosedDate = () => {
    if (!newClosedDate) return;
    if (closedDates.includes(newClosedDate)) {
      toast({ title: '중복된 날짜', description: '이미 등록된 휴무일입니다.', variant: 'destructive' });
      return;
    }
    const updated = [...closedDates, newClosedDate].sort();
    setClosedDates(updated);
    setNewClosedDate('');
    updateShopMutation.mutate({ closedDates: JSON.stringify(updated) });
  };

  const removeClosedDate = (date: string) => {
    const updated = closedDates.filter(d => d !== date);
    setClosedDates(updated);
    updateShopMutation.mutate({ closedDates: JSON.stringify(updated) });
  };

  const getTimeSlotsForDate = (dateStr: string): string[] => {
    if (!dateStr) return [];
    const [year, month, day] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    const dayKeys: (keyof BusinessDays)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const schedule = businessDays[dayKeys[dayOfWeek]];
    if (!schedule || schedule.closed) return [];
    const [sH, sM] = schedule.open.split(':').map(Number);
    const [eH, eM] = schedule.close.split(':').map(Number);
    const slots: string[] = [];
    for (let m = sH * 60 + (sM || 0); m < eH * 60 + (eM || 0); m += 30) {
      slots.push(`${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`);
    }
    return slots;
  };

  const blockDateSlots = useMemo(() => getTimeSlotsForDate(blockDate), [blockDate, businessDays]);
  const blockedForDate = blockedSlots[blockDate] || [];
  const forceOpenForDate = forceOpenSlots[blockDate] || [];

  const { data: availableTimesForDate } = useQuery<{ time: string; available: boolean; reason?: string }[]>({
    queryKey: [`/api/shops/${shop?.slug}/available-times/${blockDate}`],
    enabled: !!blockDate && !!shop?.slug,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const bookedTimeSet = useMemo(() => {
    const set = new Set<string>();
    if (!availableTimesForDate) return set;
    for (const slot of availableTimesForDate) {
      if (!slot.available && slot.reason === '예약 불가') set.add(slot.time);
    }
    return set;
  }, [availableTimesForDate]);

  const toggleBlockSlot = (slot: string) => {
    const current = blockedSlots[blockDate] || [];
    const updated = current.includes(slot) ? current.filter(s => s !== slot) : [...current, slot].sort();
    const newSlots = { ...blockedSlots };
    if (updated.length === 0) delete newSlots[blockDate]; else newSlots[blockDate] = updated;
    setBlockedSlots(newSlots);
    updateShopMutation.mutate({ blockedSlots: JSON.stringify(newSlots) });
  };

  const toggleForceOpen = (slot: string) => {
    const current = forceOpenSlots[blockDate] || [];
    const updated = current.includes(slot) ? current.filter(s => s !== slot) : [...current, slot].sort();
    const newOpen = { ...forceOpenSlots };
    if (updated.length === 0) delete newOpen[blockDate]; else newOpen[blockDate] = updated;
    setForceOpenSlots(newOpen);
    updateShopMutation.mutate({ forceOpenSlots: JSON.stringify(newOpen) });
  };

  const clearBlockedDate = (dateStr: string) => {
    const nb = { ...blockedSlots }; delete nb[dateStr];
    const nf = { ...forceOpenSlots }; delete nf[dateStr];
    setBlockedSlots(nb); setForceOpenSlots(nf);
    updateShopMutation.mutate({ blockedSlots: JSON.stringify(nb), forceOpenSlots: JSON.stringify(nf) });
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name) return;
    const duration = typeof newService.duration === 'string' ? parseInt(newService.duration, 10) || 0 : newService.duration;
    const price = typeof newService.price === 'string' ? parseInt(newService.price, 10) || 0 : newService.price;
    if (duration <= 0 || price <= 0) {
      toast({ title: '입력 오류', description: '시간과 가격을 올바르게 입력해주세요.', variant: 'destructive' });
      return;
    }
    addServiceMutation.mutate({ name: newService.name, description: newService.description || '', duration, price });
  };

  const toggleNotif = (key: KakaoTemplateKey, value: boolean) => {
    const updated = { ...notifEnabled, [key]: value };
    setNotifEnabled(updated);
    updateShopMutation.mutate({ notificationEnabled: JSON.stringify(updated) });
  };

  const saveNotifSettings = () => {
    updateShopMutation.mutate({
      bankAccount,
      notificationExtraNote: notifExtraNote,
      notificationEnabled: JSON.stringify(notifEnabled),
    });
  };

  // --- Loading / auth guard ---
  if (isAuthLoading || isShopLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!user || user.role !== 'shop_owner') return null;

  // --- Section renderers ---
  const renderInfoSection = () => (
    <Card>
      <CardHeader>
        <CardTitle>기본정보</CardTitle>
        <CardDescription>가게의 기본 정보를 설정합니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); updateShopMutation.mutate(formData); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">가게 이름</Label>
              <Input id="name" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} data-testid="input-shop-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input id="phone" type="tel" value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: formatKoreanPhone(e.target.value) }))} placeholder="010-0000-0000" data-testid="input-shop-phone" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">주소</Label>
            <Input id="address" value={formData.address} onChange={e => setFormData(f => ({ ...f, address: e.target.value }))} data-testid="input-shop-address" />
          </div>
          <Button type="submit" disabled={updateShopMutation.isPending} data-testid="button-save-shop">
            <Save className="w-4 h-4 mr-2" /> 저장
          </Button>
        </form>

        <div className="border-t pt-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <Label className="font-semibold">가게 소개 및 안내</Label>
          </div>
          <p className="text-xs text-muted-foreground">주차 안내, 찾아오는 길, 공지사항 등을 작성하세요. 예약 페이지에 표시됩니다.</p>
          <Textarea
            value={shopMemo}
            onChange={e => setShopMemo(e.target.value)}
            placeholder="예: 주차는 건물 지하 1층에서 가능합니다."
            rows={4}
            className="resize-none"
            data-testid="textarea-shop-memo"
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">{shopMemo.length}/500자</p>
            <Button size="sm" onClick={() => updateShopMutation.mutate({ shopMemo })} disabled={updateShopMutation.isPending} data-testid="button-save-shop-memo">
              <Save className="w-3.5 h-3.5 mr-1" /> 저장
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderHoursSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> 요일별 영업시간</CardTitle>
        <CardDescription>각 요일마다 영업시간을 다르게 설정하거나 휴무일로 지정할 수 있습니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(Object.keys(DAY_LABELS) as Array<keyof BusinessDays>).map(day => (
          <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 sm:w-16 font-medium text-sm">{DAY_LABELS[day]}</div>
              <Switch checked={!businessDays[day].closed} onCheckedChange={checked => updateDaySchedule(day, 'closed', !checked)} data-testid={`switch-${day}`} />
              {businessDays[day].closed && <Badge variant="secondary" className="text-muted-foreground">휴무</Badge>}
            </div>
            {!businessDays[day].closed && (
              <div className="flex items-center gap-2">
                <Input type="time" value={businessDays[day].open} onChange={e => updateDaySchedule(day, 'open', e.target.value)} className="w-[120px] sm:w-32" data-testid={`input-${day}-open`} />
                <span className="text-muted-foreground text-sm">~</span>
                <Input type="time" value={businessDays[day].close} onChange={e => updateDaySchedule(day, 'close', e.target.value)} className="w-[120px] sm:w-32" data-testid={`input-${day}-close`} />
              </div>
            )}
          </div>
        ))}
        <Button onClick={() => updateShopMutation.mutate({ businessDays: JSON.stringify(businessDays) })} disabled={updateShopMutation.isPending} data-testid="button-save-business-days">
          <Save className="w-4 h-4 mr-2" /> 영업시간 저장
        </Button>
      </CardContent>
    </Card>
  );

  const renderHolidaysSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> 임시 휴무일</CardTitle>
        <CardDescription>명절, 휴가 등 특정 날짜에 가게를 쉬는 경우 등록하세요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input type="date" value={newClosedDate} onChange={e => setNewClosedDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-auto min-w-[150px]" data-testid="input-new-closed-date" />
          <Button onClick={addClosedDate} disabled={!newClosedDate || updateShopMutation.isPending} data-testid="button-add-closed-date">
            <Plus className="w-4 h-4 mr-1" /> 추가
          </Button>
        </div>
        {closedDates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {closedDates.map(date => {
              const dateObj = new Date(date + 'T00:00:00');
              const isPast = dateObj < new Date(new Date().toDateString());
              return (
                <Badge key={date} variant={isPast ? 'secondary' : 'outline'} className={`flex items-center gap-1 px-3 py-1.5 ${isPast ? 'opacity-50' : ''}`}>
                  {format(dateObj, 'M월 d일 (EEE)', { locale: ko })}
                  <button onClick={() => removeClosedDate(date)} className="ml-1 hover:text-destructive" data-testid={`button-remove-date-${date}`}>
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
  );

  const renderBlockedSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> 시간대 차단 관리</CardTitle>
        <CardDescription>특정 날짜의 시간대를 수동으로 차단/해제하고, 예약된 시간대를 강제로 열 수 있습니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label>날짜 선택</Label>
          <Input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-auto min-w-[150px]" />
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
            <p className="text-xs text-muted-foreground">빈 시간대 클릭 → 차단/해제 | 예약된 시간대 클릭 → 강제 오픈/잠금</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {blockDateSlots.map(slot => {
                const isBooked = bookedTimeSet.has(slot);
                const isBlocked = blockedForDate.includes(slot);
                const isForceOpen = forceOpenForDate.includes(slot);
                let cls = '';
                if (isBlocked) cls = 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200';
                else if (isBooked && isForceOpen) cls = 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200';
                else if (isBooked) cls = 'bg-blue-100 text-blue-600 border-blue-300 hover:bg-blue-200';
                else cls = 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
                return (
                  <button key={slot} type="button" onClick={() => isBooked ? toggleForceOpen(slot) : toggleBlockSlot(slot)} disabled={updateShopMutation.isPending}
                    className={`px-2 py-2 rounded-lg text-sm font-medium border transition-colors ${cls}`}>
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {(Object.keys(blockedSlots).length > 0 || Object.keys(forceOpenSlots).length > 0) && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground">설정된 날짜:</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set([...Object.keys(blockedSlots), ...Object.keys(forceOpenSlots)])).sort().map(dateStr => {
                const dateObj = new Date(dateStr + 'T00:00:00');
                const parts: string[] = [];
                const bCount = (blockedSlots[dateStr] || []).length;
                const fCount = (forceOpenSlots[dateStr] || []).length;
                if (bCount > 0) parts.push(`차단 ${bCount}`);
                if (fCount > 0) parts.push(`오픈 ${fCount}`);
                return (
                  <Badge key={dateStr} variant="outline" className="flex items-center gap-1 px-3 py-1.5 cursor-pointer hover:bg-secondary/50" onClick={() => setBlockDate(dateStr)}>
                    {format(dateObj, 'M월 d일 (EEE)', { locale: ko })} - {parts.join(', ')}
                    <button onClick={e => { e.stopPropagation(); clearBlockedDate(dateStr); }} className="ml-1 hover:text-destructive">
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
  );

  const renderServicesSection = () => (
    <Card>
      <CardHeader>
        <CardTitle>서비스 관리</CardTitle>
        <CardDescription>제공하는 미용 서비스를 관리합니다</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddService} className="space-y-3 mb-6 p-4 bg-secondary/20 rounded-lg">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Input placeholder="서비스명" value={newService.name} onChange={e => setNewService(s => ({ ...s, name: e.target.value }))} className="col-span-2 sm:col-span-1" data-testid="input-new-service-name" />
            <Input type="number" min="0" placeholder="시간(분)" value={newService.duration} onChange={e => setNewService(s => ({ ...s, duration: handleNumberInput(e.target.value) }))} data-testid="input-new-service-duration" />
            <Input type="number" min="0" placeholder="가격" value={newService.price} onChange={e => setNewService(s => ({ ...s, price: handleNumberInput(e.target.value) }))} data-testid="input-new-service-price" />
          </div>
          <Input placeholder="서비스 설명 (선택사항)" value={newService.description} onChange={e => setNewService(s => ({ ...s, description: e.target.value }))} data-testid="input-new-service-description" />
          <Button type="submit" disabled={addServiceMutation.isPending} data-testid="button-add-service">
            <Plus className="w-4 h-4 mr-1" /> 추가
          </Button>
        </form>

        {isServicesLoading ? (
          <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
        ) : services && services.filter(s => s.isActive).length > 0 ? (
          <div className="space-y-2">
            {services.filter(s => s.isActive).map(service => (
              <div key={service.id} className="p-3 bg-secondary/30 rounded-lg" data-testid={`service-item-${service.id}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{service.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">{service.duration}분 / {service.price.toLocaleString()}원</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => deleteServiceMutation.mutate(service.id)} disabled={deleteServiceMutation.isPending} data-testid={`button-delete-service-${service.id}`}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                {service.description && <p className="text-sm text-muted-foreground mt-1">{service.description}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">등록된 서비스가 없습니다</p>
        )}
      </CardContent>
    </Card>
  );

  const renderDepositSection = () => (
    <Card>
      <CardHeader>
        <CardTitle>예약금 설정</CardTitle>
        <CardDescription>예약금 요구 여부와 금액을 설정합니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
          <div>
            <Label className="font-medium">예약금 요구</Label>
            <p className="text-sm text-muted-foreground mt-0.5">예약 확정 시 예약금을 요청합니다</p>
          </div>
          <Switch checked={depositRequired} onCheckedChange={setDepositRequired} data-testid="switch-deposit-required" />
        </div>
        {depositRequired && (
          <div className="space-y-2">
            <Label htmlFor="depositAmount">예약금 금액</Label>
            <div className="flex items-center gap-2">
              <Input id="depositAmount" type="number" min="0" value={depositAmount} onChange={e => setDepositAmount(handleNumberInput(e.target.value))} className="w-36" placeholder="금액 입력" data-testid="input-deposit-amount" />
              <span className="text-muted-foreground">원</span>
            </div>
          </div>
        )}
        <Button onClick={() => updateShopMutation.mutate({ depositRequired, depositAmount })} disabled={updateShopMutation.isPending} data-testid="button-save-deposit">
          <Save className="w-4 h-4 mr-2" /> 저장
        </Button>
      </CardContent>
    </Card>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground px-1">
        카카오 알림톡 고정 템플릿을 사용합니다. 문장은 수정할 수 없으며, 필요한 값만 설정하세요.
      </p>

      {/* 공통 설정: 계좌번호 + 추가 안내문구 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">알림톡 공통 설정</CardTitle>
          <CardDescription>모든 알림 유형에 공통으로 적용되는 값을 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bankAccount">입금 계좌번호 <span className="text-xs text-muted-foreground">(예약금 안내 알림에 표시)</span></Label>
            <Input
              id="bankAccount"
              value={bankAccount}
              onChange={e => setBankAccount(e.target.value)}
              placeholder="예: 신한 110-000-000000 홍길동"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notifExtraNote">추가 안내문구 <span className="text-xs text-muted-foreground">(선택, 모든 알림 하단에 1줄 추가)</span></Label>
            <Input
              id="notifExtraNote"
              value={notifExtraNote}
              onChange={e => setNotifExtraNote(e.target.value)}
              placeholder="예: 주차는 건물 지하 1층 이용 가능합니다."
              maxLength={60}
            />
          </div>
          <Button size="sm" onClick={saveNotifSettings} disabled={updateShopMutation.isPending}>
            <Save className="w-3.5 h-3.5 mr-1" /> 공통 설정 저장
          </Button>
        </CardContent>
      </Card>

      {/* 알림 유형별 활성화 + 미리보기 */}
      {KAKAO_TEMPLATE_TYPES.map((notif) => {
        const enabled = !!notifEnabled[notif.key];
        const isExpanded = expandedNotif === notif.key;
        const preview = previewKakaoTemplate(
          notif.template,
          formData.name,
          formData.phone,
          String(depositAmount || 10000),
          bankAccount,
          notifExtraNote,
        );

        return (
          <Card key={notif.key} className={cn('overflow-hidden transition-all', enabled && 'border-primary/40')}>
            <div
              className={cn('flex items-center justify-between p-4', enabled && 'cursor-pointer hover:bg-secondary/20 transition-colors')}
              onClick={() => { if (enabled) setExpandedNotif(isExpanded ? null : notif.key); }}
            >
              <div className="flex-1 min-w-0 mr-4">
                <div className="font-medium text-sm">{notif.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{notif.description}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {enabled && (
                  isExpanded
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
                <Switch
                  checked={enabled}
                  onCheckedChange={v => {
                    toggleNotif(notif.key, v);
                    if (!v) setExpandedNotif(null);
                    else setExpandedNotif(notif.key);
                  }}
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>

            {enabled && isExpanded && (
              <CardContent className="border-t pt-4 space-y-3 bg-secondary/10">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-2">발송 메시지 미리보기</p>
                  <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed font-mono">{preview}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  카카오 알림톡 심사 통과 템플릿입니다. 문장을 직접 수정할 수 없습니다.
                </p>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );

  const renderContent = (tab: SectionId | '') => {
    switch (tab) {
      case 'info':          return renderInfoSection();
      case 'hours':         return renderHoursSection();
      case 'holidays':      return renderHolidaysSection();
      case 'blocked':       return renderBlockedSection();
      case 'services':      return renderServicesSection();
      case 'deposit':       return renderDepositSection();
      case 'notifications': return renderNotificationsSection();
      default:              return null;
    }
  };

  const currentSection = SECTIONS.find(s => s.id === effectiveTab);

  // --- Header back button logic ---
  const handleBack = () => {
    if (isMobile && activeTab) {
      setActiveTab(''); // go back to list on mobile
    } else {
      setLocation('/admin/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">
              {currentSection ? currentSection.label : '운영'}
            </h1>
            <p className="text-sm text-muted-foreground">{shop?.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-52 flex-shrink-0">
            <nav className="bg-white rounded-xl border overflow-hidden sticky top-24">
              {SECTIONS.map(section => {
                const Icon = section.icon;
                const isActive = effectiveTab === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveTab(section.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left border-b last:border-b-0',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground/70 hover:bg-secondary/50'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {/* Mobile: list view (no tab selected) */}
            {!activeTab && (
              <div className="lg:hidden space-y-2">
                {SECTIONS.map(section => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveTab(section.id)}
                      className="w-full flex items-center justify-between p-4 bg-white rounded-xl border hover:bg-secondary/20 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium text-sm">{section.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Section content (mobile: only when tab selected / desktop: always) */}
            {effectiveTab && (
              <div>{renderContent(effectiveTab)}</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
