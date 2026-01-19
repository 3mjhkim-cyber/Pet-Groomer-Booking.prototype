import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useServices, useCreateBooking } from "@/hooks/use-shop";
import { Calendar as CalendarIcon, Clock, Scissors, User, Phone, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Schema matching the API input
const bookingFormSchema = z.object({
  customerName: z.string().min(2, "이름을 2글자 이상 입력해주세요"),
  customerPhone: z.string().regex(/^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/, "올바른 휴대폰 번호를 입력해주세요"),
  serviceId: z.number({ required_error: "서비스를 선택해주세요" }),
  date: z.string({ required_error: "날짜를 선택해주세요" }),
  time: z.string({ required_error: "시간을 선택해주세요" }),
});

type BookingForm = z.infer<typeof bookingFormSchema>;

export default function Booking() {
  const { data: services, isLoading: isLoadingServices } = useServices();
  const { mutate: createBooking, isPending: isBooking } = useCreateBooking();
  const [selectedService, setSelectedService] = useState<number | null>(null);

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingFormSchema),
  });

  const onSubmit = (data: BookingForm) => {
    createBooking(data);
  };

  // Generate time slots (10:00 to 18:00)
  const timeSlots = Array.from({ length: 9 }, (_, i) => {
    const hour = i + 10;
    return `${hour}:00`;
  });

  if (isLoadingServices) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-secondary/30 py-16 px-4 mb-8">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">예약하기</h1>
          <p className="text-muted-foreground text-lg">안녕 강아지와 고양이 강남점</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
          
          {/* Step 1: Service Selection */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">1</div>
              <h2 className="text-2xl font-bold">어떤 서비스가 필요하신가요?</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {services?.map((service) => (
                <label
                  key={service.id}
                  className={cn(
                    "relative cursor-pointer rounded-2xl p-6 border-2 transition-all duration-200 hover:shadow-lg",
                    selectedService === service.id
                      ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                      : "border-border bg-white hover:border-primary/50"
                  )}
                >
                  <input
                    type="radio"
                    value={service.id}
                    className="sr-only"
                    {...form.register("serviceId", { 
                      valueAsNumber: true,
                      onChange: () => setSelectedService(service.id)
                    })}
                  />
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
                </label>
              ))}
            </div>
            {form.formState.errors.serviceId && (
              <p className="mt-2 text-destructive font-medium ml-1">서비스를 선택해주세요.</p>
            )}
          </section>

          {/* Step 2: Date & Time */}
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
                  className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:outline-none transition-colors"
                />
                {form.formState.errors.date && <p className="text-destructive text-sm">{form.formState.errors.date.message}</p>}
              </div>

              <div className="space-y-4">
                <label className="block font-medium text-foreground/80 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> 시간 선택
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {timeSlots.map((time) => (
                    <label key={time} className="cursor-pointer">
                      <input
                        type="radio"
                        value={time}
                        {...form.register("time")}
                        className="peer sr-only"
                      />
                      <div className="text-center py-2 rounded-lg border border-border peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary peer-hover:bg-secondary/20 transition-all">
                        {time}
                      </div>
                    </label>
                  ))}
                </div>
                {form.formState.errors.time && <p className="text-destructive text-sm">{form.formState.errors.time.message}</p>}
              </div>
            </div>
          </section>

          {/* Step 3: Customer Info */}
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
                />
                {form.formState.errors.customerName && <p className="text-destructive text-sm">{form.formState.errors.customerName.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="font-medium text-foreground/80 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> 연락처
                </label>
                <input
                  {...form.register("customerPhone")}
                  placeholder="010-1234-5678"
                  className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                />
                {form.formState.errors.customerPhone && <p className="text-destructive text-sm">{form.formState.errors.customerPhone.message}</p>}
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={isBooking}
            className="w-full py-5 rounded-2xl font-bold text-xl text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
          >
            {isBooking ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                예약 처리중...
              </>
            ) : (
              <>
                예약 완료하기
                <CheckCircle2 className="w-6 h-6" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
