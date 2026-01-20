import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Clock, Scissors, User, Phone, CheckCircle2, Loader2, MapPin, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Shop, Service } from "@shared/schema";
import { formatKoreanPhone } from "@/lib/phone";
import { useAvailableTimeSlots } from "@/hooks/use-shop";

const bookingFormSchema = z.object({
  customerName: z.string().min(2, "이름을 2글자 이상 입력해주세요"),
  customerPhone: z.string().regex(/^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/, "올바른 휴대폰 번호를 입력해주세요"),
  serviceId: z.number({ required_error: "서비스를 선택해주세요" }),
  date: z.string({ required_error: "날짜를 선택해주세요" }),
  time: z.string({ required_error: "시간을 선택해주세요" }),
});

type BookingForm = z.infer<typeof bookingFormSchema>;

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
    },
    onError: (error: Error) => {
      toast({
        title: "예약 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingFormSchema),
  });

  // 선택한 서비스의 소요시간 가져오기
  const selectedServiceData = services?.find(s => s.id === selectedService);
  const serviceDuration = selectedServiceData?.duration || 60;

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
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary text-white py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold mb-2">{shop.name}</h1>
          <div className="space-y-2 text-white/90">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>{shop.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{shop.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>영업시간: {shop.businessHours}</span>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <a href={`tel:${shop.phone}`}>
              <Button variant="secondary" size="sm" className="gap-2" data-testid="button-call">
                <Phone className="w-4 h-4" />
                전화걸기
              </Button>
            </a>
            <a href={`https://map.naver.com/v5/search/${encodeURIComponent(shop.address)}`} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm" className="gap-2" data-testid="button-map">
                <MapPin className="w-4 h-4" />
                지도보기
              </Button>
            </a>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl py-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
          
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">1</div>
              <h2 className="text-2xl font-bold">어떤 서비스가 필요하신가요?</h2>
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
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">2</div>
              <h2 className="text-2xl font-bold">언제 방문하실 건가요?</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-8 rounded-3xl border border-border shadow-sm">
              <div className="space-y-4">
                <label className="block font-medium text-foreground/80 mb-2 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" /> 날짜 선택
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  {...form.register("date")}
                  onChange={(e) => {
                    form.setValue("date", e.target.value, { shouldValidate: true });
                    setSelectedDate(e.target.value);
                    form.setValue("time", ""); // 날짜 변경 시 시간 초기화
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:outline-none transition-colors"
                  data-testid="input-date"
                />
                {form.formState.errors.date && <p className="text-destructive text-sm">{form.formState.errors.date.message}</p>}
              </div>

              <div className="space-y-4">
                <label className="block font-medium text-foreground/80 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> 시간 선택
                  {!selectedDate && <span className="text-sm text-muted-foreground">(날짜를 먼저 선택해주세요)</span>}
                </label>
                {isLoadingSlots && selectedDate && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
                {selectedDate && !isLoadingSlots && (
                  <div className="grid grid-cols-3 gap-3">
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
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">3</div>
              <h2 className="text-2xl font-bold">예약자 정보를 입력해주세요</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-3xl border border-border shadow-sm">
              <div className="space-y-2">
                <label className="font-medium text-foreground/80 flex items-center gap-2">
                  <User className="w-4 h-4" /> 예약자 성함
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
                <label className="font-medium text-foreground/80 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> 연락처
                </label>
                <input
                  value={form.watch("customerPhone") || ""}
                  onChange={(e) => {
                    const formatted = formatKoreanPhone(e.target.value);
                    form.setValue("customerPhone", formatted, { shouldValidate: true });
                  }}
                  placeholder="010-1234-5678"
                  className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  data-testid="input-phone"
                />
                {form.formState.errors.customerPhone && <p className="text-destructive text-sm">{form.formState.errors.customerPhone.message}</p>}
              </div>
            </div>
          </section>

          {shop.depositRequired && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
              <p className="text-yellow-800">
                예약 확정 시 예약금 <strong>{shop.depositAmount.toLocaleString()}원</strong>이 필요합니다.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={createBookingMutation.isPending}
            className="w-full py-5 rounded-2xl font-bold text-xl text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
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
