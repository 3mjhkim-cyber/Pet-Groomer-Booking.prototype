import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Clock, Scissors, User, Phone, CheckCircle2, Loader2, MapPin, XCircle, PawPrint, Info, FileText } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Shop, Service, Customer } from "@shared/schema";
import { formatKoreanPhone } from "@/lib/phone";
import { useAvailableTimeSlots } from "@/hooks/use-shop";
import { checkClosedStatus, getClosedDatesInRange } from "@/lib/date-utils";

const bookingFormSchema = z.object({
  customerName: z.string().min(2, "보호자 이름을 2글자 이상 입력해주세요"),
  customerPhone: z.string().regex(/^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/, "올바른 휴대폰 번호를 입력해주세요"),
  petName: z.string().min(1, "반려동물 이름을 입력해주세요"),
  petBreed: z.string().min(1, "반려동물 종을 입력해주세요"),
  petAge: z.string().optional(),
  petWeight: z.string().optional(),
  serviceId: z.number({ required_error: "서비스를 선택해주세요" }),
  date: z.string({ required_error: "날짜를 선택해주세요" }),
  time: z.string({ required_error: "시간을 선택해주세요" }),
  memo: z.string().max(500, "특이사항은 500자 이내로 입력해주세요").optional(),
});

type BookingForm = z.infer<typeof bookingFormSchema>;

// 요일별 영업시간 타입
type DaySchedule = {
  open: string;
  close: string;
  closed: boolean;
};

type BusinessDays = {
  [key: string]: DaySchedule;
};

const DAY_NAMES: { [key: string]: string } = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일'
};

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// 영업시간을 그룹화하여 간결하게 표시
function formatBusinessHoursCompact(businessDays: BusinessDays | null, defaultHours: string): string {
  if (!businessDays) return defaultHours;

  // 영업 요일과 휴무 요일 분리
  const openDays: string[] = [];
  const closedDays: string[] = [];
  const hourGroups: { [hours: string]: string[] } = {};

  DAY_ORDER.forEach(day => {
    const schedule = businessDays[day];
    if (schedule?.closed) {
      closedDays.push(DAY_NAMES[day]);
    } else if (schedule) {
      openDays.push(day);
      const hours = `${schedule.open}-${schedule.close}`;
      if (!hourGroups[hours]) hourGroups[hours] = [];
      hourGroups[hours].push(DAY_NAMES[day]);
    }
  });

  // 시간대별로 요일 그룹화하여 표시
  const parts: string[] = [];
  Object.entries(hourGroups).forEach(([hours, days]) => {
    if (days.length === 7) {
      parts.push(`매일 ${hours}`);
    } else if (days.length >= 5 && closedDays.length <= 2) {
      parts.push(`${days.join('')} ${hours}`);
    } else {
      parts.push(`${days.join('')} ${hours}`);
    }
  });

  if (closedDays.length > 0 && closedDays.length <= 2) {
    parts.push(`${closedDays.join('')} 휴무`);
  }

  return parts.join(' | ') || defaultHours;
}

// 특정 날짜가 휴무일인지 확인
function isDateClosed(date: Date, businessDays: BusinessDays | null, closedDates: string[] | null): boolean {
  const dateStr = format(date, 'yyyy-MM-dd');

  // 임시 휴무일 체크
  if (closedDates?.includes(dateStr)) {
    return true;
  }

  // 요일별 영업일 체크
  if (businessDays) {
    const dayIndex = getDay(date); // 0 = 일요일
    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayKey = dayMap[dayIndex];
    const daySchedule = businessDays[dayKey];
    if (daySchedule?.closed) {
      return true;
    }
  }

  return false;
}

export default function Booking() {
  const [, params] = useRoute('/book/:slug');
  const slug = params?.slug || 'gangnam';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: shop, isLoading: isLoadingShop, error: shopError } = useQuery<Shop>({
    queryKey: ['/api/shops', slug],
    queryFn: async () => {
      const res = await fetch(`/api/shops/${slug}`);
      if (!res.ok) throw new Error("Shop not found");
      return res.json();
    },
  });

  const { data: services, isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ['/api/shops', slug, 'services'],
    queryFn: async () => {
      const res = await fetch(`/api/shops/${slug}/services`);
      if (!res.ok) throw new Error("Services not found");
      return res.json();
    },
    enabled: !!shop,
  });

  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);

  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingForm & { shopId: number }) => {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "예약에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "예약 신청 완료",
        description: "예약이 접수되었습니다. 가게에서 확인 후 연락드리겠습니다.",
      });
      form.reset();
      setSelectedService(null);
      setExistingCustomer(null);
    },
    onError: (error: Error) => {
      toast({
        title: "예약 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const checkExistingCustomer = async (phone: string) => {
    if (!phone || phone.length < 10) return;
    setIsCheckingCustomer(true);
    try {
      const res = await fetch(`/api/shops/${slug}/customers/check?phone=${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.exists && data.customer) {
          setExistingCustomer(data.customer);
          form.setValue("customerName", data.customer.name);
          if (data.customer.petName) form.setValue("petName", data.customer.petName);
          if (data.customer.petBreed) form.setValue("petBreed", data.customer.petBreed);
          if (data.customer.petAge) form.setValue("petAge", data.customer.petAge);
          if (data.customer.petWeight) form.setValue("petWeight", data.customer.petWeight);
          toast({
            title: "기존 고객 정보 확인",
            description: `${data.customer.name}님, ${data.customer.visitCount}회 방문하신 고객입니다.`,
          });
        } else {
          setExistingCustomer(null);
        }
      }
    } catch (error) {
      console.error("고객 확인 오류:", error);
    } finally {
      setIsCheckingCustomer(false);
    }
  };

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingFormSchema),
  });

  // 선택한 서비스의 소요시간 가져오기
  const selectedServiceData = services?.find(s => s.id === selectedService);
  const serviceDuration = selectedServiceData?.duration || 60;

  // 휴무일 목록 계산 (90일 범위)
  const closedDatesList = useMemo(() => {
    if (!shop) return [];
    const shopData = shop as Shop & { closedDates?: string | null; businessDays?: string | null };
    return getClosedDatesInRange(
      new Date(),
      90,
      shopData.closedDates,
      shopData.businessDays
    );
  }, [shop]);

  // 예약 가능 시간대 조회
  const { data: availableSlots, isLoading: isLoadingSlots } = useAvailableTimeSlots(
    slug,
    selectedDate,
    serviceDuration
  );

  const onSubmit = (data: BookingForm) => {
    if (!shop) return;
    createBookingMutation.mutate({ ...data, shopId: shop.id });
  };

  if (isLoadingShop || isLoadingServices) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (shopError || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">가게를 찾을 수 없습니다</h1>
          <p className="text-muted-foreground">URL을 다시 확인해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 booking-page">
      <div className="bg-primary text-white py-4 px-4">
        <div className="container mx-auto max-w-4xl booking-container">
          {/* 상단: 가게명 + 액션 버튼 */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{shop.name}</h1>
            <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
              <a href={`tel:${shop.phone}`}>
                <Button variant="secondary" size="sm" className="gap-1 sm:gap-1.5 h-8 px-2 sm:px-3 text-xs sm:text-sm" data-testid="button-call">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">전화</span>
                </Button>
              </a>
              <a href={`https://map.naver.com/v5/search/${encodeURIComponent(shop.address)}`} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm" className="gap-1 sm:gap-1.5 h-8 px-2 sm:px-3 text-xs sm:text-sm" data-testid="button-map">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">지도</span>
                </Button>
              </a>
            </div>
          </div>

          {/* 중단: 핵심 정보 */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-x-4 sm:gap-y-1 text-xs sm:text-sm text-white/90">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{formatBusinessHoursCompact(
                (shop as any).businessDays ? JSON.parse((shop as any).businessDays) : null,
                shop.businessHours
              )}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{shop.address}</span>
            </span>
          </div>

          {/* 하단: 안내사항 (있을 경우만) */}
          {(shop as any).shopMemo && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-sm text-white/90 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{(shop as any).shopMemo}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 max-w-4xl py-6 sm:py-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 sm:space-y-12">

          <section>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg sm:text-xl flex-shrink-0">1</div>
              <h2 className="text-lg sm:text-2xl font-bold">어떤 서비스가 필요하신가요?</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {services?.map((service) => (
                <div
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service.id);
                    form.setValue("serviceId", service.id, { shouldValidate: true });
                  }}
                  className={cn(
                    "relative cursor-pointer rounded-2xl p-6 border-2 transition-all duration-200 hover:shadow-lg",
                    selectedService === service.id
                      ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                      : "border-border bg-white hover:border-primary/50"
                  )}
                  data-testid={`service-${service.id}`}
                >
                  {selectedService === service.id && (
                    <div className="absolute top-4 right-4 text-primary">
                      <CheckCircle2 className="w-6 h-6 fill-current" />
                    </div>
                  )}
                  <Scissors className={cn("w-8 h-8 mb-4", selectedService === service.id ? "text-primary" : "text-muted-foreground")} />
                  <h3 className="font-bold text-lg mb-1">{service.name}</h3>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {service.duration}분
                    </span>
                    <span className="font-bold text-foreground">{service.price.toLocaleString()}원</span>
                  </div>
                </div>
              ))}
            </div>
            {form.formState.errors.serviceId && (
              <p className="mt-2 text-destructive font-medium ml-1">서비스를 선택해주세요.</p>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg sm:text-xl flex-shrink-0">2</div>
              <h2 className="text-lg sm:text-2xl font-bold">언제 방문하실 건가요?</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-white p-4 sm:p-6 rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="date-section">
                <label className="flex items-center gap-2 font-medium text-foreground/80 text-sm sm:text-base">
                  <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                  <span>날짜 선택</span>
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  {...form.register("date")}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (!newDate) {
                      setSelectedDate('');
                      form.setValue("date", '', { shouldValidate: true });
                      return;
                    }

                    // 휴무일 체크
                    const shopData = shop as Shop & { closedDates?: string | null; businessDays?: string | null };
                    const closedCheck = checkClosedStatus(newDate, shopData?.closedDates, shopData?.businessDays);

                    if (closedCheck.isClosed) {
                      // 휴무일 선택 시 경고 토스트 표시하고 선택 초기화
                      toast({
                        title: "휴무일입니다",
                        description: `${closedCheck.reason} - 다른 날짜를 선택해주세요.`,
                        variant: "destructive",
                      });
                      e.target.value = selectedDate || ''; // 이전 값으로 되돌림
                      return;
                    }

                    form.setValue("date", newDate, { shouldValidate: true });
                    setSelectedDate(newDate);
                    form.setValue("time", ""); // 날짜 변경 시 시간 초기화
                  }}
                  className="w-full h-12 px-4 rounded-xl border-2 border-border focus:border-primary focus:outline-none transition-colors text-base"
                  data-testid="input-date"
                />
                {form.formState.errors.date && <p className="text-destructive text-sm">{form.formState.errors.date.message}</p>}

                {/* 휴무일 안내 */}
                {closedDatesList.length > 0 && (
                  <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>
                      가까운 휴무일: {closedDatesList.slice(0, 3).map(d => {
                        const date = new Date(d);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }).join(', ')}
                      {closedDatesList.length > 3 && ' 등'}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 font-medium text-foreground/80 text-sm sm:text-base">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>시간 선택</span>
                  {!selectedDate && <span className="text-xs text-muted-foreground ml-1">(날짜 먼저 선택)</span>}
                </label>
                {isLoadingSlots && selectedDate && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
                {selectedDate && !isLoadingSlots && availableSlots?.[0]?.closed ? (
                  <div className="text-center py-6 bg-amber-50 border border-amber-200 rounded-lg">
                    <XCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="font-medium text-amber-800">휴무일입니다</p>
                    <p className="text-sm text-amber-600 mt-1">{availableSlots[0].reason}</p>
                    <p className="text-sm text-muted-foreground mt-2">다른 날짜를 선택해주세요</p>
                  </div>
                ) : selectedDate && !isLoadingSlots && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2 sm:gap-3">
                    {availableSlots?.map((slot: { time: string; available: boolean; reason?: string }) => (
                      <label key={slot.time} className={cn(
                        slot.available ? "cursor-pointer" : "cursor-not-allowed"
                      )}>
                        <input
                          type="radio"
                          value={slot.time}
                          {...form.register("time")}
                          disabled={!slot.available}
                          className="peer sr-only"
                          data-testid={`time-${slot.time}`}
                        />
                        <div className={cn(
                          "text-center py-2 rounded-lg border transition-all relative",
                          slot.available
                            ? "border-border peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary hover:bg-secondary/20"
                            : "bg-muted/50 text-muted-foreground border-muted line-through"
                        )}>
                          {slot.time}
                          {!slot.available && (
                            <XCircle className="w-3 h-3 absolute top-1 right-1 text-muted-foreground" />
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {!selectedDate && (
                  <div className="text-center py-4 text-muted-foreground bg-muted/30 rounded-lg">
                    날짜를 선택하면 예약 가능한 시간이 표시됩니다
                  </div>
                )}
                {form.formState.errors.time && <p className="text-destructive text-sm">{form.formState.errors.time.message}</p>}
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg sm:text-xl flex-shrink-0">3</div>
              <h2 className="text-lg sm:text-2xl font-bold">예약자 정보를 입력해주세요</h2>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-border shadow-sm space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 font-medium text-foreground/80 text-sm sm:text-base">
                    <User className="w-4 h-4 flex-shrink-0" /> 보호자 이름 *
                  </label>
                  <input
                    {...form.register("customerName")}
                    placeholder="홍길동"
                    className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                    data-testid="input-name"
                  />
                  {form.formState.errors.customerName && <p className="text-destructive text-sm">{form.formState.errors.customerName.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 font-medium text-foreground/80 text-sm sm:text-base">
                    <Phone className="w-4 h-4 flex-shrink-0" /> 전화번호 *
                  </label>
                  <div className="relative">
                    <input
                      value={form.watch("customerPhone") || ""}
                      onChange={(e) => {
                        const formatted = formatKoreanPhone(e.target.value);
                        form.setValue("customerPhone", formatted, { shouldValidate: true });
                      }}
                      onBlur={(e) => checkExistingCustomer(e.target.value)}
                      placeholder="010-1234-5678"
                      className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      data-testid="input-phone"
                    />
                    {isCheckingCustomer && (
                      <Loader2 className="w-4 h-4 animate-spin absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    )}
                  </div>
                  {form.formState.errors.customerPhone && <p className="text-destructive text-sm">{form.formState.errors.customerPhone.message}</p>}
                </div>
              </div>

              {existingCustomer && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {existingCustomer.visitCount}
                  </div>
                  <div>
                    <p className="font-medium text-green-800">재방문 고객입니다!</p>
                    <p className="text-sm text-green-700">
                      {existingCustomer.name}님, 총 {existingCustomer.visitCount}회 방문
                      {existingCustomer.petName && ` | 반려동물: ${existingCustomer.petName}`}
                    </p>
                    {existingCustomer.memo && (
                      <p className="text-sm text-green-600 mt-1">이전 특이사항: {existingCustomer.memo.split('\n').slice(-1)[0]}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t pt-4 sm:pt-5">
                <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                  <PawPrint className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" /> 반려동물 정보
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="font-medium text-foreground/80 text-sm sm:text-base">반려동물 이름 *</label>
                    <input
                      {...form.register("petName")}
                      placeholder="예: 뭉치"
                      className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      data-testid="input-pet-name"
                    />
                    {form.formState.errors.petName && <p className="text-destructive text-sm">{form.formState.errors.petName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="font-medium text-foreground/80 text-sm sm:text-base">반려동물 종 *</label>
                    <input
                      {...form.register("petBreed")}
                      placeholder="예: 말티즈, 푸들, 시츄 등"
                      className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      data-testid="input-pet-breed"
                    />
                    {form.formState.errors.petBreed && <p className="text-destructive text-sm">{form.formState.errors.petBreed.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="font-medium text-foreground/80 text-sm sm:text-base">반려동물 나이 (선택)</label>
                    <input
                      {...form.register("petAge")}
                      placeholder="예: 3살"
                      className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      data-testid="input-pet-age"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-medium text-foreground/80 text-sm sm:text-base">반려동물 몸무게 (선택)</label>
                    <input
                      {...form.register("petWeight")}
                      placeholder="예: 5kg"
                      className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      data-testid="input-pet-weight"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 sm:pt-5">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 font-medium text-foreground/80 text-sm sm:text-base">
                    <FileText className="w-4 h-4 flex-shrink-0" /> 특이사항 (선택)
                  </label>
                  <textarea
                    {...form.register("memo")}
                    placeholder="예: 물을 무서워해요, 털이 많이 엉켜있어요, 예민한 성격이에요"
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none"
                    data-testid="input-memo"
                  />
                  <p className="text-sm text-muted-foreground text-right">{(form.watch("memo") || "").length}/500</p>
                  {form.formState.errors.memo && <p className="text-destructive text-sm">{form.formState.errors.memo.message}</p>}
                </div>

                <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: '#FFF9E6' }}>
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm" style={{ color: '#666666' }}>
                      <p className="font-medium mb-1">안내사항</p>
                      <p>털 엉킴, 과도한 짖음, 공격성 등 반려동물의 상태나 행동에 따라 추가 비용이 발생할 수 있습니다. 정확한 비용은 미용 전 상담을 통해 안내드립니다.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {shop.depositRequired && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
              <p className="text-yellow-800 text-sm sm:text-base">
                예약 확정 시 예약금 <strong>{shop.depositAmount.toLocaleString()}원</strong>이 필요합니다.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={createBookingMutation.isPending}
            className="w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-xl text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 sm:gap-3"
            data-testid="button-submit-booking"
          >
            {createBookingMutation.isPending ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                예약 처리중...
              </>
            ) : (
              <>
                예약 신청하기
                <CheckCircle2 className="w-6 h-6" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
