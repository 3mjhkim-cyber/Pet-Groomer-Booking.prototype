import { useAuth } from "@/hooks/use-auth";
import { useBookings } from "@/hooks/use-shop";
import { useLocation } from "wouter";
import { Loader2, Calendar, Clock, User, Phone, Scissors, LogOut } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const { data: bookings, isLoading: isBookingsLoading } = useBookings();
  const [_, setLocation] = useLocation();

  if (isAuthLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!user) {
    setLocation("/login");
    return null;
  }

  // Group bookings by date
  const groupedBookings = bookings?.reduce((acc, booking) => {
    if (!acc[booking.date]) acc[booking.date] = [];
    acc[booking.date].push(booking);
    return acc;
  }, {} as Record<string, typeof bookings>);

  // Sort dates
  const sortedDates = Object.keys(groupedBookings || {}).sort();

  return (
    <div className="min-h-screen bg-secondary/10 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-border shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{user.shopName}</h1>
            <p className="text-sm text-muted-foreground">관리자 대시보드</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium bg-secondary/50 px-3 py-1 rounded-full text-secondary-foreground">
              {user.email}
            </span>
            <button
              onClick={() => logout()}
              className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          예약 현황
        </h2>

        {isBookingsLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : bookings?.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-border">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground">예약이 없습니다</h3>
            <p className="text-muted-foreground">새로운 예약이 들어오면 이곳에 표시됩니다.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedDates.map(date => (
              <div key={date} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="text-lg font-bold bg-white px-4 py-1 rounded-full border border-border shadow-sm">
                    {date}
                  </h3>
                  <div className="h-px bg-border flex-1" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedBookings![date].sort((a,b) => a.time.localeCompare(b.time)).map(booking => (
                    <div 
                      key={booking.id}
                      className="bg-white rounded-2xl p-6 border border-border hover:shadow-lg hover:border-primary/30 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2 text-primary font-bold text-lg bg-primary/5 px-3 py-1 rounded-lg">
                          <Clock className="w-4 h-4" />
                          {booking.time}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          booking.status === 'confirmed' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {booking.status === 'confirmed' ? '예약확정' : '취소됨'}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary/30 flex items-center justify-center text-secondary-foreground">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold">{booking.customerName}</div>
                            <div className="text-xs text-muted-foreground">고객님</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center text-accent-foreground">
                            <Scissors className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium">{booking.serviceName}</div>
                            <div className="text-xs text-muted-foreground">서비스</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-3 border-t border-dashed border-border">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-mono text-muted-foreground">{booking.customerPhone}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
