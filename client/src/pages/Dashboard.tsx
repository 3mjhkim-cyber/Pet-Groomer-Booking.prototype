import { useAuth } from "@/hooks/use-auth";
import { useBookings, useServices, useApproveBooking, useRejectBooking, useRequestDeposit, useAdminCreateBooking, useSearchCustomers, useCustomerHistory, useCancelBooking, useUpdateBooking, useUpdateBookingCustomer } from "@/hooks/use-shop";
import { useLocation } from "wouter";
import { Loader2, Calendar, Clock, User, Phone, Scissors, Check, X, Banknote, Plus, Link, Copy, History, Edit, XCircle, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Customer, Booking } from "@shared/schema";
import { formatKoreanPhone } from "@/lib/phone";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export default function Dashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: bookings, isLoading: isBookingsLoading } = useBookings();
  const { data: services } = useServices();
  const { mutate: approveBooking } = useApproveBooking();
  const { mutate: rejectBooking } = useRejectBooking();
  const { mutate: requestDeposit } = useRequestDeposit();
  const { mutate: createBooking, isPending: isCreating } = useAdminCreateBooking();
  const { mutate: cancelBooking, isPending: isCancelling } = useCancelBooking();
  const { mutate: updateBooking, isPending: isUpdating } = useUpdateBooking();
  const { mutate: updateBookingCustomer, isPending: isUpdatingCustomer } = useUpdateBookingCustomer();
  const [_, setLocation] = useLocation();
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // 예약 수정 다이얼로그 상태
  const [editBooking, setEditBooking] = useState<(Booking & { serviceName: string }) | null>(null);
  const [editForm, setEditForm] = useState({ date: '', time: '', serviceId: 0 });
  
  // 고객 정보 수정 다이얼로그 상태
  const [editCustomerBooking, setEditCustomerBooking] = useState<(Booking & { serviceName: string }) | null>(null);
  const [editCustomerForm, setEditCustomerForm] = useState({ customerName: '', customerPhone: '' });
  
  // 취소 확인 다이얼로그 상태
  const [cancelConfirmBooking, setCancelConfirmBooking] = useState<(Booking & { serviceName: string }) | null>(null);
  
  const { data: searchResults } = useSearchCustomers(searchQuery);
  const { data: customerHistoryData } = useCustomerHistory(selectedCustomerPhone);

  // 실시간 업데이트: 2초마다 예약 데이터 갱신
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
    }, 2000);
    return () => clearInterval(interval);
  }, [queryClient]);

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
  
  const openEditDialog = (booking: Booking & { serviceName: string }) => {
    setEditBooking(booking);
    setEditForm({
      date: booking.date,
      time: booking.time,
      serviceId: booking.serviceId,
    });
  };
  
  const openEditCustomerDialog = (booking: Booking & { serviceName: string }) => {
    setEditCustomerBooking(booking);
    setEditCustomerForm({
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
    });
  };
  
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBooking) return;
    updateBooking({ id: editBooking.id, data: editForm }, {
      onSuccess: () => setEditBooking(null),
    });
  };
  
  const handleEditCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomerBooking) return;
    updateBookingCustomer({ id: editCustomerBooking.id, data: editCustomerForm }, {
      onSuccess: () => setEditCustomerBooking(null),
    });
  };
  
  const handleCancelConfirm = () => {
    if (!cancelConfirmBooking) return;
    cancelBooking(cancelConfirmBooking.id, {
      onSuccess: () => setCancelConfirmBooking(null),
    });
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

  // pending, confirmed만 표시 (cancelled, rejected는 숨김)
  const pendingBookings = bookings?.filter(b => b.status === 'pending') || [];
  const confirmedBookings = bookings?.filter(b => b.status === 'confirmed') || [];

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.serviceId) return;
    createBooking({ ...manualForm, shopId: user.shopId });
    setIsManualDialogOpen(false);
    setManualForm({ customerName: '', customerPhone: '', serviceId: 0, date: '', time: '10:00' });
  };

  const timeSlots = Array.from({ length: 18 }, (_, i) => {
    const hour = Math.floor(i / 2) + 9;
    const min = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${min}`;
  });

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
            {user.shop?.isApproved ? (
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
            ) : (
              <span className="text-sm text-muted-foreground bg-yellow-100 px-3 py-1.5 rounded-lg">
                승인 대기중
              </span>
            )}
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
                    onChange={e => setManualForm(f => ({...f, customerPhone: formatKoreanPhone(e.target.value)}))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                    placeholder="010-0000-0000"
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
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="pending" className="gap-2" data-testid="tab-pending">
                <Clock className="w-4 h-4" />
                승인 대기
                {pendingBookings.length > 0 && (
                  <Badge variant="destructive" className="ml-1">{pendingBookings.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="confirmed" className="gap-2" data-testid="tab-confirmed">
                <Check className="w-4 h-4" />
                확정된 예약
                {confirmedBookings.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{confirmedBookings.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* 승인 대기 탭 */}
            <TabsContent value="pending">
              {pendingBookings.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-border">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">대기 중인 예약이 없습니다</p>
                  <p className="text-sm text-muted-foreground mt-1">새 예약이 들어오면 자동으로 표시됩니다</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingBookings.map(booking => (
                    <div key={booking.id} className="bg-white rounded-2xl p-5 border-2 border-orange-300 shadow-sm" data-testid={`card-pending-${booking.id}`}>
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
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 gap-1" 
                            onClick={() => {
                              requestDeposit(booking.id);
                              copyDepositLink(booking.id);
                            }} 
                            data-testid={`button-deposit-link-${booking.id}`}
                          >
                            <Banknote className="w-4 h-4" />
                            예약금 링크
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 gap-1" onClick={() => approveBooking(booking.id)} data-testid={`button-approve-${booking.id}`}>
                            <Check className="w-4 h-4" />
                            바로 확정
                          </Button>
                          <Button size="sm" variant="destructive" className="flex-1 gap-1" onClick={() => rejectBooking(booking.id)} data-testid={`button-reject-${booking.id}`}>
                            <X className="w-4 h-4" />
                            거절
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 확정된 예약 탭 */}
            <TabsContent value="confirmed">
              {confirmedBookings.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-border">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">확정된 예약이 없습니다</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {confirmedBookings.map(booking => (
                    <div key={booking.id} className="bg-white rounded-2xl p-5 border-2 border-green-300 shadow-sm" data-testid={`card-confirmed-${booking.id}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-3 py-1 rounded-lg">
                          <Check className="w-4 h-4" />
                          {booking.time}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{booking.date}</span>
                          {booking.depositStatus === 'paid' && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">입금완료</Badge>
                          )}
                          {booking.depositStatus === 'waiting' && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">입금대기</Badge>
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
                      
                      {/* 확정된 예약 액션 버튼 */}
                      <div className="space-y-2">
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
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 gap-1"
                            onClick={() => openEditDialog(booking)}
                            data-testid={`button-edit-${booking.id}`}
                          >
                            <Edit className="w-4 h-4" />
                            변경
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 gap-1"
                            onClick={() => openEditCustomerDialog(booking)}
                            data-testid={`button-edit-customer-${booking.id}`}
                          >
                            <UserCog className="w-4 h-4" />
                            고객수정
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="gap-1"
                            onClick={() => setCancelConfirmBooking(booking)}
                            data-testid={`button-cancel-${booking.id}`}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
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
                          booking.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {booking.status === 'confirmed' ? '확정' : 
                           booking.status === 'pending' ? '대기' : 
                           booking.status === 'cancelled' ? '취소' : '거절'}
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
      
      {/* 예약 수정 다이얼로그 */}
      <Dialog open={!!editBooking} onOpenChange={() => setEditBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예약 변경</DialogTitle>
            <DialogDescription>날짜, 시간, 서비스를 수정할 수 있습니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">날짜</label>
              <input
                type="date"
                value={editForm.date}
                onChange={e => setEditForm(f => ({...f, date: e.target.value}))}
                className="w-full px-3 py-2 border rounded-lg mt-1"
                required
                data-testid="input-edit-date"
              />
            </div>
            <div>
              <label className="text-sm font-medium">시간</label>
              <select
                value={editForm.time}
                onChange={e => setEditForm(f => ({...f, time: e.target.value}))}
                className="w-full px-3 py-2 border rounded-lg mt-1"
                data-testid="select-edit-time"
              >
                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">서비스</label>
              <select
                value={editForm.serviceId}
                onChange={e => setEditForm(f => ({...f, serviceId: Number(e.target.value)}))}
                className="w-full px-3 py-2 border rounded-lg mt-1"
                data-testid="select-edit-service"
              >
                {services?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name} - {s.price.toLocaleString()}원</option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditBooking(null)}>취소</Button>
              <Button type="submit" disabled={isUpdating} data-testid="button-submit-edit">
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : '변경 저장'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* 고객 정보 수정 다이얼로그 */}
      <Dialog open={!!editCustomerBooking} onOpenChange={() => setEditCustomerBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>고객 정보 수정</DialogTitle>
            <DialogDescription>고객 이름과 전화번호를 수정할 수 있습니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCustomerSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">고객명</label>
              <input
                type="text"
                value={editCustomerForm.customerName}
                onChange={e => setEditCustomerForm(f => ({...f, customerName: e.target.value}))}
                className="w-full px-3 py-2 border rounded-lg mt-1"
                required
                data-testid="input-edit-customer-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">전화번호</label>
              <input
                type="tel"
                value={editCustomerForm.customerPhone}
                onChange={e => setEditCustomerForm(f => ({...f, customerPhone: formatKoreanPhone(e.target.value)}))}
                className="w-full px-3 py-2 border rounded-lg mt-1"
                placeholder="010-0000-0000"
                required
                data-testid="input-edit-customer-phone"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditCustomerBooking(null)}>취소</Button>
              <Button type="submit" disabled={isUpdatingCustomer} data-testid="button-submit-edit-customer">
                {isUpdatingCustomer ? <Loader2 className="w-4 h-4 animate-spin" /> : '수정 저장'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* 예약 취소 확인 다이얼로그 */}
      <Dialog open={!!cancelConfirmBooking} onOpenChange={() => setCancelConfirmBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예약 취소</DialogTitle>
            <DialogDescription>
              정말 이 예약을 취소하시겠습니까? 취소된 예약은 캘린더와 목록에서 사라지며, 해당 시간대가 다시 예약 가능해집니다.
            </DialogDescription>
          </DialogHeader>
          {cancelConfirmBooking && (
            <div className="bg-secondary/30 rounded-lg p-4 my-4">
              <p className="font-medium">{cancelConfirmBooking.customerName}</p>
              <p className="text-sm text-muted-foreground">{cancelConfirmBooking.date} {cancelConfirmBooking.time}</p>
              <p className="text-sm text-muted-foreground">{cancelConfirmBooking.serviceName}</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelConfirmBooking(null)}>아니오</Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleCancelConfirm}
              disabled={isCancelling}
              data-testid="button-confirm-cancel"
            >
              {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : '예약 취소'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
