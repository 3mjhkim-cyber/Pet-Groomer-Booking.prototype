import { useAuth } from "@/hooks/use-auth";
import { useBookings, useServices, useApproveBooking, useRejectBooking, useRequestDeposit, useCreateBooking, useSearchCustomers, useCustomerHistory } from "@/hooks/use-shop";
import { useLocation } from "wouter";
import { Loader2, Calendar, Clock, User, Phone, Scissors, Check, X, Banknote, Plus, Link, Copy, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Customer } from "@shared/schema";

export default function Dashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: bookings, isLoading: isBookingsLoading } = useBookings();
  const { data: services } = useServices();
  const { mutate: approveBooking } = useApproveBooking();
  const { mutate: rejectBooking } = useRejectBooking();
  const { mutate: requestDeposit } = useRequestDeposit();
  const { mutate: createBooking, isPending: isCreating } = useCreateBooking();
  const [_, setLocation] = useLocation();
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const { data: searchResults } = useSearchCustomers(searchQuery);
  const { data: customerHistoryData } = useCustomerHistory(selectedCustomerPhone);

  const copyDepositLink = (bookingId: number) => {
    const link = `${window.location.origin}/deposit/${bookingId}`;
    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: "링크 복사됨",
        description: "입금 페이지 링크가 클립보드에 복사되었습니다.",
      });
    });
  };
  
  const openCustomerHistory = (phone: string) => {
    setSelectedCustomerPhone(phone);
    setIsHistoryDialogOpen(true);
  };
  
  const selectCustomer = (customer: Customer) => {
    setManualForm(f => ({
      ...f, 
      customerName: customer.name, 
      customerPhone: customer.phone
    }));
    setSearchQuery('');
    setShowSuggestions(false);
  };
  
  const [manualForm, setManualForm] = useState({
    customerName: '',
    customerPhone: '',
    serviceId: 0,
    date: '',
    time: '10:00'
  });
  
  useEffect(() => {
    if (manualForm.customerName.length >= 1) {
      setSearchQuery(manualForm.customerName);
    } else {
      setSearchQuery('');
    }
  }, [manualForm.customerName]);

  if (isAuthLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!user) {
    setLocation("/login");
    return null;
  }

  const pendingBookings = bookings?.filter(b => b.status === 'pending') || [];
  const confirmedBookings = bookings?.filter(b => b.status === 'confirmed') || [];

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.serviceId) return;
    createBooking({ ...manualForm, shopId: user.shopId });
    setIsManualDialogOpen(false);
    setManualForm({ customerName: '', customerPhone: '', serviceId: 0, date: '', time: '10:00' });
  };

  const timeSlots = Array.from({ length: 9 }, (_, i) => `${i + 10}:00`);

  return (
    <div className="min-h-screen bg-secondary/10 pb-20">
      <div className="bg-white border-b border-border shadow-sm sticky top-16 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{user.shopName}</h1>
            <p className="text-sm text-muted-foreground">관리자 대시보드</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/admin/settings')}
              data-testid="button-settings"
            >
              <Scissors className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                const slug = user.shop?.slug || 'gangnam';
                const link = `${window.location.origin}/book/${slug}`;
                navigator.clipboard.writeText(link).then(() => {
                  toast({
                    title: "예약 링크 복사됨",
                    description: "고객에게 공유할 수 있는 예약 페이지 링크가 복사되었습니다.",
                  });
                });
              }}
              data-testid="button-copy-booking-link"
            >
              <Link className="w-4 h-4" />
              예약 링크 복사
            </Button>
          <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-manual-booking">
                <Plus className="w-4 h-4" />
                수동 예약 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>수동 예약 추가</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="relative">
                  <label className="text-sm font-medium">고객명</label>
                  <input
                    type="text"
                    value={manualForm.customerName}
                    onChange={e => setManualForm(f => ({...f, customerName: e.target.value}))}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                    required
                    autoComplete="off"
                    data-testid="input-manual-name"
                  />
                  {showSuggestions && searchResults && searchResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map((customer: Customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => selectCustomer(customer)}
                          className="w-full px-3 py-2 text-left hover:bg-secondary/50 flex justify-between items-center"
                          data-testid={`customer-suggestion-${customer.id}`}
                        >
                          <div>
                            <span className="font-medium">{customer.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">{customer.phone}</span>
                          </div>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            방문 {customer.visitCount}회
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">전화번호</label>
                  <input
                    type="tel"
                    value={manualForm.customerPhone}
                    onChange={e => setManualForm(f => ({...f, customerPhone: e.target.value}))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                    required
                    data-testid="input-manual-phone"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">서비스</label>
                  <select
                    value={manualForm.serviceId}
                    onChange={e => setManualForm(f => ({...f, serviceId: Number(e.target.value)}))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                    required
                    data-testid="select-manual-service"
                  >
                    <option value={0}>선택하세요</option>
                    {services?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} - {s.price.toLocaleString()}원</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">날짜</label>
                    <input
                      type="date"
                      value={manualForm.date}
                      onChange={e => setManualForm(f => ({...f, date: e.target.value}))}
                      className="w-full px-3 py-2 border rounded-lg mt-1"
                      required
                      data-testid="input-manual-date"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">시간</label>
                    <select
                      value={manualForm.time}
                      onChange={e => setManualForm(f => ({...f, time: e.target.value}))}
                      className="w-full px-3 py-2 border rounded-lg mt-1"
                      data-testid="select-manual-time"
                    >
                      {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isCreating} data-testid="button-submit-manual">
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : '예약 추가'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {isBookingsLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-10">
            {/* Pending Section */}
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                승인 대기 ({pendingBookings.length})
              </h2>
              {pendingBookings.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-border">
                  <p className="text-muted-foreground">대기 중인 예약이 없습니다</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingBookings.map(booking => (
                    <div key={booking.id} className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm" data-testid={`card-pending-${booking.id}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 text-orange-600 font-bold bg-orange-50 px-3 py-1 rounded-lg">
                          <Clock className="w-4 h-4" />
                          {booking.time}
                        </div>
                        <span className="text-sm text-muted-foreground">{booking.date}</span>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <button 
                            onClick={() => openCustomerHistory(booking.customerPhone)}
                            className="font-medium text-primary hover:underline flex items-center gap-1"
                            data-testid={`button-customer-history-${booking.id}`}
                          >
                            {booking.customerName}
                            <History className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-mono">{booking.customerPhone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Scissors className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{booking.serviceName}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 gap-1" onClick={() => approveBooking(booking.id)} data-testid={`button-approve-${booking.id}`}>
                          <Check className="w-4 h-4" />
                          승인
                        </Button>
                        <Button size="sm" variant="destructive" className="flex-1 gap-1" onClick={() => rejectBooking(booking.id)} data-testid={`button-reject-${booking.id}`}>
                          <X className="w-4 h-4" />
                          거절
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Confirmed Section */}
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                확정된 예약 ({confirmedBookings.length})
              </h2>
              {confirmedBookings.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-border">
                  <p className="text-muted-foreground">확정된 예약이 없습니다</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {confirmedBookings.map(booking => (
                    <div key={booking.id} className="bg-white rounded-2xl p-5 border border-green-200 shadow-sm" data-testid={`card-confirmed-${booking.id}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-3 py-1 rounded-lg">
                          <Clock className="w-4 h-4" />
                          {booking.time}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{booking.date}</span>
                          {booking.depositStatus === 'paid' && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">입금완료</span>
                          )}
                          {booking.depositStatus === 'waiting' && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">입금대기</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <button 
                            onClick={() => openCustomerHistory(booking.customerPhone)}
                            className="font-medium text-primary hover:underline flex items-center gap-1"
                            data-testid={`button-customer-history-confirmed-${booking.id}`}
                          >
                            {booking.customerName}
                            <History className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-mono">{booking.customerPhone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Scissors className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{booking.serviceName}</span>
                        </div>
                      </div>
                      {booking.depositStatus === 'none' && (
                        <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => requestDeposit(booking.id)} data-testid={`button-deposit-${booking.id}`}>
                          <Banknote className="w-4 h-4" />
                          예약금 요청
                        </Button>
                      )}
                      {booking.depositStatus === 'waiting' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 gap-1" 
                            onClick={() => copyDepositLink(booking.id)}
                            data-testid={`button-copy-link-${booking.id}`}
                          >
                            <Copy className="w-4 h-4" />
                            링크 복사
                          </Button>
                          <a href={`/deposit/${booking.id}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                            <Button size="sm" variant="secondary" className="w-full gap-1">
                              <Link className="w-4 h-4" />
                              페이지 보기
                            </Button>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
      
      {/* Customer History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              고객 이력
            </DialogTitle>
          </DialogHeader>
          {customerHistoryData && (
            <div className="space-y-4">
              {customerHistoryData.customer && (
                <div className="bg-secondary/30 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-lg">{customerHistoryData.customer.name}</span>
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                      방문 {customerHistoryData.customer.visitCount}회
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>{customerHistoryData.customer.phone}</p>
                    {customerHistoryData.customer.lastVisit && (
                      <p>최근 방문: {new Date(customerHistoryData.customer.lastVisit).toLocaleDateString('ko-KR')}</p>
                    )}
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="font-medium mb-2">예약 이력</h4>
                {customerHistoryData.history && customerHistoryData.history.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {customerHistoryData.history.map((booking: any) => (
                      <div key={booking.id} className="flex justify-between items-center p-3 bg-white border rounded-lg">
                        <div>
                          <p className="font-medium">{booking.serviceName}</p>
                          <p className="text-sm text-muted-foreground">{booking.date} {booking.time}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {booking.status === 'confirmed' ? '확정' : 
                           booking.status === 'pending' ? '대기' : '거절'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">예약 이력이 없습니다</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
