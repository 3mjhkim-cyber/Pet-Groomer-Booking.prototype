import { useAuth } from "@/hooks/use-auth";
import { useBookings } from "@/hooks/use-shop";
import { useLocation } from "wouter";
import { Loader2, CalendarDays, Clock, User, Scissors } from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BookingEvent {
  id: string;
  title: string;
  start: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    customerName: string;
    customerPhone: string;
    serviceName: string;
    status: string;
    time: string;
  };
}

export default function Calendar() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: bookings, isLoading: isBookingsLoading } = useBookings();
  const [_, setLocation] = useLocation();
  const [selectedEvent, setSelectedEvent] = useState<BookingEvent | null>(null);

  if (isAuthLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!user) {
    setLocation("/login");
    return null;
  }

  // cancelled, rejected 예약은 캘린더에서 숨김 (pending, confirmed만 표시)
  const events: BookingEvent[] = bookings
    ?.filter(booking => booking.status === 'pending' || booking.status === 'confirmed')
    .map(booking => ({
      id: String(booking.id),
      title: `${booking.time} ${booking.customerName}`,
      start: `${booking.date}T${booking.time}`,
      backgroundColor: booking.status === 'confirmed' ? '#22c55e' : '#f97316',
      borderColor: booking.status === 'confirmed' ? '#16a34a' : '#ea580c',
      extendedProps: {
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        serviceName: booking.serviceName,
        status: booking.status,
        time: booking.time,
      },
    })) || [];

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event as unknown as BookingEvent);
  };

  return (
    <div className="min-h-screen bg-secondary/10 pb-20">
      <div className="bg-white border-b border-border shadow-sm sticky top-16 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">예약 캘린더</h1>
            <p className="text-sm text-muted-foreground">{user.shopName}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {isBookingsLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border p-4 sm:p-6 shadow-sm calendar-wrap">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              events={events}
              eventClick={handleEventClick}
              height="auto"
              locale="ko"
              buttonText={{
                today: '오늘',
                month: '월',
                week: '주',
                day: '일'
              }}
            />
          </div>
        )}
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예약 상세</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
                <span className="font-bold text-lg">{selectedEvent.extendedProps.time}</span>
                <span className={`ml-auto px-2 py-1 rounded text-xs font-bold ${
                  selectedEvent.extendedProps.status === 'confirmed' 
                    ? 'bg-green-100 text-green-700' 
                    : selectedEvent.extendedProps.status === 'pending'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {selectedEvent.extendedProps.status === 'confirmed' ? '확정' : selectedEvent.extendedProps.status === 'pending' ? '대기' : '거절'}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{selectedEvent.extendedProps.customerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Scissors className="w-5 h-5 text-muted-foreground" />
                  <span>{selectedEvent.extendedProps.serviceName}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="font-mono">{selectedEvent.extendedProps.customerPhone}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
