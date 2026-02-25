import { useAuth } from "@/hooks/use-auth";
import { useBookings } from "@/hooks/use-shop";
import { useLocation } from "wouter";
import { Loader2, CalendarDays, Clock, User, Scissors, Phone } from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface BookingEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    customerName: string;
    customerPhone: string;
    serviceName: string;
    petName: string;
    petBreed: string;
    status: string;
    time: string;
    duration: number;
    depositStatus: string;
  };
}

export default function Calendar() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: bookings, isLoading: isBookingsLoading } = useBookings();
  const [_, setLocation] = useLocation();
  const [selectedEvent, setSelectedEvent] = useState<BookingEvent | null>(null);
  const [currentView, setCurrentView] = useState("dayGridMonth");
  const [isMobile, setIsMobile] = useState(false);
  const calendarRef = useRef<any>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      setLocation("/login");
    }
  }, [isAuthLoading, user, setLocation]);

  useEffect(() => {
    if (user?.role === 'shop_owner' && user?.shop) {
      const shop = user.shop as any;
      const accessible = shop.subscriptionStatus === 'active' ||
        (shop.subscriptionStatus === 'cancelled' && shop.subscriptionEnd && new Date(shop.subscriptionEnd) > new Date());
      if (!accessible) setLocation("/admin/subscription");
    }
  }, [user, setLocation]);

  if (isAuthLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!user) {
    return null;
  }

  const events: BookingEvent[] = bookings
    ?.filter(booking => booking.status === 'pending' || booking.status === 'confirmed')
    .map(booking => {
      const [h, m] = booking.time.split(':').map(Number);
      const duration = (booking as any).serviceDuration || 60;
      const startMin = h * 60 + m;
      const endMin = startMin + duration;
      const endH = Math.floor(endMin / 60);
      const endM = endMin % 60;
      const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

      const isConfirmed = booking.status === 'confirmed';

      return {
        id: String(booking.id),
        title: `${booking.customerName} - ${booking.serviceName}`,
        start: `${booking.date}T${booking.time}`,
        end: `${booking.date}T${endTime}`,
        backgroundColor: isConfirmed ? '#dcfce7' : '#fff7ed',
        borderColor: isConfirmed ? '#22c55e' : '#f97316',
        textColor: isConfirmed ? '#166534' : '#9a3412',
        extendedProps: {
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          serviceName: booking.serviceName,
          petName: (booking as any).petName || '',
          petBreed: (booking as any).petBreed || '',
          status: booking.status,
          time: booking.time,
          duration,
          depositStatus: (booking as any).depositStatus || 'none',
        },
      };
    }) || [];

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event as unknown as BookingEvent);
  };

  // 이벤트 렌더링
  const renderEventContent = (eventInfo: any) => {
    const props = eventInfo.event.extendedProps;
    const isConfirmed = props.status === 'confirmed';
    const viewType = eventInfo.view.type;

    // 리스트 뷰 (일간/주간) - 카드 스타일
    if (viewType === 'listDay' || viewType === 'listWeek') {
      return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-1 w-full">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${isConfirmed ? 'bg-green-500' : 'bg-orange-400'}`} />
            <span className="font-bold text-sm truncate">{props.customerName}</span>
            <span className="text-xs text-muted-foreground truncate">· {props.serviceName}</span>
          </div>
          <div className="flex items-center gap-2 pl-4 sm:pl-0">
            <span className="text-xs text-muted-foreground">{props.duration}분</span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 h-5 ${
                isConfirmed
                  ? 'bg-green-50 text-green-700 border-green-300'
                  : 'bg-orange-50 text-orange-700 border-orange-300'
              }`}
            >
              {isConfirmed ? '확정' : '대기'}
            </Badge>
          </div>
        </div>
      );
    }

    // 월간 뷰 - 컴팩트
    if (viewType === 'dayGridMonth') {
      return (
        <div className="w-full px-1 py-0.5 overflow-hidden leading-tight">
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px]">
            <span className="font-semibold">{eventInfo.timeText}</span>
            <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConfirmed ? 'bg-green-500' : 'bg-orange-400'}`} />
          </div>
          <div className="text-[11px] sm:text-[12px] font-bold truncate">{props.customerName}</div>
        </div>
      );
    }

    // 주간 타임그리드 뷰 (데스크탑)
    return (
      <div className="w-full px-1.5 py-1 overflow-hidden leading-tight">
        <div className="flex items-center gap-1 text-[11px] font-semibold">
          <span>{eventInfo.timeText}</span>
          <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConfirmed ? 'bg-green-500' : 'bg-orange-400'}`} />
        </div>
        <div className="text-[12px] font-bold truncate">{props.customerName}</div>
        <div className="text-[10px] opacity-75 truncate">{props.serviceName}</div>
      </div>
    );
  };

  // 모바일/데스크탑별 뷰 설정
  const headerToolbar = isMobile
    ? {
        left: 'prev,next',
        center: 'title',
        right: 'dayGridMonth,listWeek,listDay'
      }
    : {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listDay'
      };

  return (
    <div className="min-h-screen bg-secondary/10 pb-20">
      <div className="bg-white border-b border-border shadow-sm sticky top-16 z-10">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center gap-2 sm:gap-3">
          <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold truncate">예약 캘린더</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.shopName}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs flex-shrink-0">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-green-100 border border-green-500" />
              <span className="hidden sm:inline">확정</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-orange-50 border border-orange-400" />
              <span className="hidden sm:inline">대기</span>
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {isBookingsLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-border p-2 sm:p-6 shadow-sm calendar-wrap calendar-mobile">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
              initialView="dayGridMonth"
              headerToolbar={headerToolbar}
              views={{
                listDay: {
                  listDayFormat: { month: 'long', day: 'numeric', weekday: 'short' },
                  noEventsContent: '예약이 없습니다',
                },
                listWeek: {
                  listDayFormat: { month: 'numeric', day: 'numeric', weekday: 'short' },
                  listDaySideFormat: false,
                  noEventsContent: '이번 주 예약이 없습니다',
                },
                timeGridWeek: {
                  slotMinTime: '08:00:00',
                  slotMaxTime: '21:00:00',
                  allDaySlot: false,
                  slotLabelFormat: {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  },
                },
                dayGridMonth: {
                  dayMaxEvents: isMobile ? 2 : 3,
                },
              }}
              events={events}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
              height="auto"
              locale="ko"
              direction="ltr"
              buttonText={{
                today: '오늘',
                month: '월',
                week: '주',
                day: '일'
              }}
              moreLinkText={(n) => `+${n}`}
              allDaySlot={false}
              eventDisplay="block"
              displayEventEnd={false}
              datesSet={(dateInfo) => {
                setCurrentView(dateInfo.view.type);
              }}
              titleFormat={isMobile ? { year: 'numeric', month: 'short' } : { year: 'numeric', month: 'long' }}
            />
          </div>
        )}
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>예약 상세</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-bold text-lg">{selectedEvent.extendedProps.time}</span>
                <span className="text-sm text-muted-foreground">({selectedEvent.extendedProps.duration}분)</span>
                <div className="ml-auto flex gap-1.5">
                  <Badge
                    variant="outline"
                    className={
                      selectedEvent.extendedProps.status === 'confirmed'
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : selectedEvent.extendedProps.status === 'pending'
                        ? 'bg-orange-100 text-orange-700 border-orange-300'
                        : 'bg-red-100 text-red-700 border-red-300'
                    }
                  >
                    {selectedEvent.extendedProps.status === 'confirmed' ? '확정' : selectedEvent.extendedProps.status === 'pending' ? '대기' : '거절'}
                  </Badge>
                  {selectedEvent.extendedProps.depositStatus === 'paid' && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                      입금
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium">{selectedEvent.extendedProps.customerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <span className="font-mono text-sm">{selectedEvent.extendedProps.customerPhone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Scissors className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <span>{selectedEvent.extendedProps.serviceName}</span>
                </div>
                {selectedEvent.extendedProps.petName && (
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 text-center text-muted-foreground flex-shrink-0">🐾</span>
                    <span>{selectedEvent.extendedProps.petName}</span>
                    {selectedEvent.extendedProps.petBreed && (
                      <span className="text-sm text-muted-foreground">({selectedEvent.extendedProps.petBreed})</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
