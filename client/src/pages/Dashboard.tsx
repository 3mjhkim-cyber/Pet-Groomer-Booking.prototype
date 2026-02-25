import { useAuth } from "@/hooks/use-auth";
import { useBookings, useServices, useApproveBooking, useRejectBooking, useRequestDeposit, useAdminCreateBooking, useSearchCustomers, useCustomerHistory, useCancelBooking, useUpdateBooking, useUpdateBookingCustomer, useAdminConfirmDeposit } from "@/hooks/use-shop";
import { useLocation } from "wouter";
import { Loader2, Calendar, Clock, User, Phone, Scissors, Check, X, Banknote, Plus, Link, Copy, History, Edit, XCircle, UserCog, PawPrint, FileText, Bell, MessageCircle, ChevronLeft, ChevronRight, LayoutDashboard, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import type { Customer, Booking } from "@shared/schema";
import { formatKoreanPhone } from "@/lib/phone";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays, subDays, isAfter, parse, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";

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
  const { mutate: adminConfirmDeposit, isPending: isConfirmingDeposit } = useAdminConfirmDeposit();
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
  
  // 고객 정보 상세 모달 상태
  const [customerDetailId, setCustomerDetailId] = useState<number | null>(null);
  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState(false);
  
  // 리마인드 모달 상태
  const [remindBooking, setRemindBooking] = useState<(Booking & { serviceName: string }) | null>(null);

  // 대시보드 일정 상세 모달 상태
  const [dashboardDetailBooking, setDashboardDetailBooking] = useState<(Booking & { serviceName: string }) | null>(null);

  // 확정 예약 날짜 필터 상태
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const { data: searchResults } = useSearchCustomers(searchQuery);
  const { data: customerHistoryData } = useCustomerHistory(selectedCustomerPhone);

  // 리마인드 전송 mutation
  const { mutate: sendRemind, isPending: isSendingRemind } = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest('PATCH', `/api/bookings/${bookingId}/remind`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "리마인드 전송 완료",
        description: "리마인드가 전송된 것으로 표시되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      setRemindBooking(null);
    },
  });

  // 다이얼로그가 열려있는지 확인
  const isAnyDialogOpen = isHistoryDialogOpen || isCustomerDetailOpen || !!remindBooking || !!editBooking || !!editCustomerBooking || !!cancelConfirmBooking || isManualDialogOpen || isCalendarOpen;
  
  // 실시간 업데이트: 2초마다 예약 데이터 갱신 (다이얼로그가 열려있으면 일시 중지)
  useEffect(() => {
    if (isAnyDialogOpen) return;
    
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
    }, 2000);
    return () => clearInterval(interval);
  }, [queryClient, isAnyDialogOpen]);

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

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const confirmedBookings = useMemo(() => {
    const filtered = bookings?.filter(b =>
      b.status === 'confirmed' && b.date === selectedDateStr
    ) || [];
    return filtered.sort((a, b) => a.time.localeCompare(b.time));
  }, [bookings, selectedDateStr]);

  const servicePriceMap = useMemo(() => {
    const map: Record<number, number> = {};
    services?.forEach((s: any) => { map[s.id] = s.price; });
    return map;
  }, [services]);

  const todayConfirmedBookings = useMemo(() => {
    return bookings
      ?.filter(b => b.status === 'confirmed' && b.date === todayStr)
      .sort((a, b) => a.time.localeCompare(b.time)) || [];
  }, [bookings, todayStr]);

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

  const pendingApprovalBookings = bookings?.filter(b => b.status === 'pending' && b.depositStatus !== 'waiting') || [];
  const depositWaitingBookings = bookings?.filter(b => b.status === 'pending' && b.depositStatus === 'waiting') || [];
  const totalPendingCount = pendingApprovalBookings.length + depositWaitingBookings.length;

  const isPastTime = (bookingDate: string, bookingTime: string): boolean => {
    const now = new Date();
    const bookingDateTime = parse(
      `${bookingDate} ${bookingTime}`,
      'yyyy-MM-dd HH:mm',
      new Date()
    );
    return isAfter(now, bookingDateTime);
  };

  const todayConfirmedCount = bookings?.filter(b => b.status === 'confirmed' && b.date === todayStr).length || 0;

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
        <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{user.shopName}</h1>
            <p className="text-sm text-muted-foreground">관리자 대시보드</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
                <span className="hidden sm:inline">예약 링크 복사</span>
                <span className="sm:hidden">링크</span>
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground bg-yellow-100 px-3 py-1.5 rounded-lg whitespace-nowrap">
                승인 대기중
              </span>
            )}
          <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-manual-booking">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">수동 예약 추가</span>
                <span className="sm:hidden">예약</span>
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
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="dashboard" className="gap-2" data-testid="tab-dashboard">
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">대시보드</span>
                <span className="sm:hidden">홈</span>
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2" data-testid="tab-pending">
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">예약 요청</span>
                <span className="sm:hidden">요청</span>
                {totalPendingCount > 0 && (
                  <Badge variant="destructive" className="ml-1">{totalPendingCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="confirmed" className="gap-2" data-testid="tab-confirmed">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">확정 예약</span>
                <span className="sm:hidden">확정</span>
                {todayConfirmedCount > 0 && (
                  <Badge variant="secondary" className="ml-1">{todayConfirmedCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* 대시보드 개요 탭 */}
            <TabsContent value="dashboard" className="space-y-6">
              {/* 오늘 총 매출 */}
              <div className="bg-white rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">오늘 총 매출</p>
                    <p className="text-3xl sm:text-4xl font-bold text-primary mt-1">
                      {(() => {
                        const todayRevenue = todayConfirmedBookings.reduce(
                          (sum, b) => sum + (servicePriceMap[b.serviceId] || 0), 0
                        );
                        return todayRevenue.toLocaleString();
                      })()}원
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">확정 예약 {todayConfirmedCount}건 기준</p>
                  </div>
                  <DollarSign className="w-10 h-10 text-primary/20" />
                </div>
              </div>

              {/* 오늘의 일정 */}
              <div className="bg-white rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
                <h3 className="font-semibold text-base sm:text-lg mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  오늘의 일정
                  {todayConfirmedCount > 0 && (
                    <Badge variant="secondary" className="ml-auto">{todayConfirmedCount}건</Badge>
                  )}
                </h3>
                {todayConfirmedBookings.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>오늘 예약이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayConfirmedBookings.map(booking => {
                      const past = isPastTime(booking.date, booking.time);
                      return (
                        <button
                          key={booking.id}
                          onClick={() => setDashboardDetailBooking(booking)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer ${
                            past ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-border hover:border-primary/30 hover:shadow-sm'
                          }`}
                        >
                          <div className={`text-center min-w-[52px] px-2 py-1.5 rounded-lg font-bold text-sm ${
                            past ? 'bg-gray-100 text-gray-500' : 'bg-primary/10 text-primary'
                          }`}>
                            {booking.time}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{booking.customerName}</p>
                            <p className="text-xs text-muted-foreground truncate">{booking.serviceName}</p>
                          </div>
                          {past ? <Check className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 대기 중 탭 (승인 대기 + 예약금 대기) */}
            <TabsContent value="pending" className="space-y-8">
              {/* 섹션 1: 승인 대기 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  📋 승인 대기 중
                  {pendingApprovalBookings.length > 0 && (
                    <Badge variant="destructive">{pendingApprovalBookings.length}건</Badge>
                  )}
                </h3>
                {pendingApprovalBookings.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-border">
                    <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">승인 대기 중인 예약이 없습니다</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingApprovalBookings.map(booking => (
                      <div key={booking.id} className="bg-white rounded-2xl p-5 border-2 border-orange-300 shadow-sm" data-testid={`card-pending-${booking.id}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            {booking.isFirstVisit ? (
                              <Badge className="bg-blue-500 hover:bg-blue-600 text-white">첫 방문</Badge>
                            ) : (
                              <Badge className="bg-green-500 hover:bg-green-600 text-white">재방문</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-orange-600 font-bold bg-orange-50 px-3 py-1 rounded-lg">
                            <Clock className="w-4 h-4" />
                            {booking.time}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">{booking.date}</div>

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
                            <span className="text-sm font-mono text-muted-foreground">{booking.customerPhone}</span>
                          </div>

                          {(booking.petName || booking.petBreed) && (
                            <div className="flex items-center gap-2 text-sm">
                              <PawPrint className="w-4 h-4 text-amber-500" />
                              <span className="font-medium">{booking.petName}</span>
                              {booking.petBreed && <span className="text-muted-foreground">({booking.petBreed})</span>}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Scissors className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{booking.serviceName}</span>
                          </div>

                          {booking.memo && (
                            <div className="p-2 bg-muted/50 rounded-lg text-sm">
                              <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{booking.memo}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex gap-2">
                            {booking.customerId && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => {
                                  setCustomerDetailId(booking.customerId);
                                  setIsCustomerDetailOpen(true);
                                }}
                                data-testid={`button-customer-info-${booking.id}`}
                              >
                                <User className="w-4 h-4" />
                                고객 정보
                              </Button>
                            )}
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
              </div>

              {/* 섹션 2: 예약금 대기 중 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  📌 예약금 대기 중
                  {depositWaitingBookings.length > 0 && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">{depositWaitingBookings.length}건</Badge>
                  )}
                </h3>
                {depositWaitingBookings.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-border">
                    <Banknote className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">예약금 대기 중인 예약이 없습니다</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {depositWaitingBookings.map(booking => (
                      <div key={booking.id} className="bg-white rounded-2xl p-5 border-2 border-yellow-300 shadow-sm" data-testid={`card-deposit-waiting-${booking.id}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            {booking.isFirstVisit ? (
                              <Badge className="bg-blue-500 hover:bg-blue-600 text-white">첫 방문</Badge>
                            ) : (
                              <Badge className="bg-green-500 hover:bg-green-600 text-white">재방문</Badge>
                            )}
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                              예약금 대기
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-yellow-700 font-bold bg-yellow-50 px-3 py-1 rounded-lg">
                            <Clock className="w-4 h-4" />
                            {booking.time}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">{booking.date}</div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <button
                              onClick={() => openCustomerHistory(booking.customerPhone)}
                              className="font-medium text-primary hover:underline flex items-center gap-1"
                              data-testid={`button-customer-history-deposit-${booking.id}`}
                            >
                              {booking.customerName}
                              <History className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-mono text-muted-foreground">{booking.customerPhone}</span>
                          </div>

                          {(booking.petName || booking.petBreed) && (
                            <div className="flex items-center gap-2 text-sm">
                              <PawPrint className="w-4 h-4 text-amber-500" />
                              <span className="font-medium">{booking.petName}</span>
                              {booking.petBreed && <span className="text-muted-foreground">({booking.petBreed})</span>}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Scissors className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{booking.serviceName}</span>
                          </div>

                          {booking.memo && (
                            <div className="p-2 bg-muted/50 rounded-lg text-sm">
                              <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{booking.memo}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex gap-2">
                            {booking.customerId && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => {
                                  setCustomerDetailId(booking.customerId);
                                  setIsCustomerDetailOpen(true);
                                }}
                                data-testid={`button-customer-info-deposit-${booking.id}`}
                              >
                                <User className="w-4 h-4" />
                                고객 정보
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-1"
                              onClick={() => copyDepositLink(booking.id)}
                              data-testid={`button-copy-deposit-link-${booking.id}`}
                            >
                              <Copy className="w-4 h-4" />
                              링크 복사
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 gap-1 bg-green-600 hover:bg-green-700"
                              onClick={() => adminConfirmDeposit(booking.id)}
                              disabled={isConfirmingDeposit}
                              data-testid={`button-confirm-deposit-${booking.id}`}
                            >
                              {isConfirmingDeposit ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              입금확인
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1 gap-1" onClick={() => rejectBooking(booking.id)} data-testid={`button-reject-deposit-${booking.id}`}>
                              <X className="w-4 h-4" />
                              거절
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 전체 대기 예약이 없는 경우 */}
              {totalPendingCount === 0 && (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-border">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">대기 중인 예약이 없습니다</p>
                  <p className="text-sm text-muted-foreground mt-1">새 예약이 들어오면 자동으로 표시됩니다</p>
                </div>
              )}
            </TabsContent>

            {/* 확정된 예약 탭 */}
            <TabsContent value="confirmed">
              {/* 날짜 선택기 */}
              <div className="flex items-center justify-center gap-4 mb-6 bg-white rounded-xl p-4 border border-border">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                  data-testid="button-prev-date"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>

                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="flex items-center gap-2 min-w-[180px] justify-center px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                      data-testid="button-open-calendar"
                    >
                      <Calendar className="w-5 h-5 text-primary" />
                      <span className="text-lg font-semibold">
                        {format(selectedDate, 'yyyy-MM-dd (EEE)', { locale: ko })}
                      </span>
                      {isSameDay(selectedDate, new Date()) && (
                        <Badge variant="secondary" className="text-xs">오늘</Badge>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <CalendarPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setIsCalendarOpen(false);
                        }
                      }}
                      locale={ko}
                      initialFocus
                    />
                    <div className="p-2 border-t flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedDate(new Date());
                          setIsCalendarOpen(false);
                        }}
                      >
                        오늘로 이동
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  data-testid="button-next-date"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              {confirmedBookings.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-border">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {format(selectedDate, 'M월 d일', { locale: ko })}에 확정된 예약이 없습니다
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {confirmedBookings.map(booking => {
                    const past = isPastTime(booking.date, booking.time);
                    return (
                      <div
                        key={booking.id}
                        className={`rounded-2xl p-5 border-2 shadow-sm transition-all ${
                          past
                            ? 'bg-gray-50 border-gray-200 opacity-60'
                            : 'bg-white border-green-300'
                        }`}
                        data-testid={`card-confirmed-${booking.id}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            {past && (
                              <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-300">완료</Badge>
                            )}
                            {booking.isFirstVisit ? (
                              <Badge className={past ? "bg-blue-400 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}>첫 방문</Badge>
                            ) : (
                              <Badge className={past ? "bg-green-400 text-white" : "bg-green-500 hover:bg-green-600 text-white"}>재방문</Badge>
                            )}
                          </div>
                          <div className={`flex items-center gap-2 font-bold px-3 py-1 rounded-lg ${
                            past
                              ? 'text-gray-500 bg-gray-100'
                              : 'text-green-600 bg-green-50'
                          }`}>
                            {past ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            {booking.time}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                          {booking.depositStatus === 'paid' && (
                            <Badge variant="outline" className={past ? "bg-gray-100 text-gray-500 border-gray-200" : "bg-green-50 text-green-700 border-green-200"}>입금완료</Badge>
                          )}
                          {booking.depositStatus === 'waiting' && (
                            <Badge variant="outline" className={past ? "bg-gray-100 text-gray-500 border-gray-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}>입금대기</Badge>
                          )}
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <button
                              onClick={() => openCustomerHistory(booking.customerPhone)}
                              className={`font-medium hover:underline flex items-center gap-1 ${past ? 'text-muted-foreground' : 'text-primary'}`}
                              data-testid={`button-customer-history-confirmed-${booking.id}`}
                            >
                              {booking.customerName}
                              <History className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-mono text-muted-foreground">{booking.customerPhone}</span>
                          </div>

                          {(booking.petName || booking.petBreed) && (
                            <div className="flex items-center gap-2 text-sm">
                              <PawPrint className={`w-4 h-4 ${past ? 'text-gray-400' : 'text-amber-500'}`} />
                              <span className="font-medium">{booking.petName}</span>
                              {booking.petBreed && <span className="text-muted-foreground">({booking.petBreed})</span>}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Scissors className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{booking.serviceName}</span>
                          </div>

                          {booking.memo && (
                            <div className="p-2 bg-muted/50 rounded-lg text-sm">
                              <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{booking.memo}</span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-sm">
                            <Bell className="w-4 h-4 text-muted-foreground" />
                            {booking.remindSent ? (
                              <span className={`flex items-center gap-1 ${past ? 'text-gray-500' : 'text-green-600'}`}>
                                <Check className="w-3 h-3" />
                                전송됨 {booking.remindSentAt && `(${new Date(booking.remindSentAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })})`}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">리마인드 미전송</span>
                            )}
                          </div>
                        </div>

                        {/* 확정된 예약 액션 버튼 */}
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            {booking.customerId && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => {
                                  setCustomerDetailId(booking.customerId);
                                  setIsCustomerDetailOpen(true);
                                }}
                                data-testid={`button-customer-info-confirmed-${booking.id}`}
                              >
                                <User className="w-4 h-4" />
                                고객 정보
                              </Button>
                            )}
                            {!past && (
                              <Button
                                size="sm"
                                variant={booking.remindSent ? "ghost" : "outline"}
                                className="flex-1 gap-1"
                                onClick={() => setRemindBooking(booking)}
                                data-testid={`button-remind-${booking.id}`}
                              >
                                <MessageCircle className="w-4 h-4" />
                                {booking.remindSent ? '재전송' : '리마인드 전송'}
                              </Button>
                            )}
                          </div>

                          {!past && booking.depositStatus === 'none' && (
                            <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => requestDeposit(booking.id)} data-testid={`button-deposit-${booking.id}`}>
                              <Banknote className="w-4 h-4" />
                              예약금 요청
                            </Button>
                          )}
                          {!past && booking.depositStatus === 'waiting' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full gap-1"
                              onClick={() => copyDepositLink(booking.id)}
                              data-testid={`button-copy-link-${booking.id}`}
                            >
                              <Copy className="w-4 h-4" />
                              입금 링크 복사
                            </Button>
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
                    );
                  })}
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
      
      {/* 리마인드 전송 다이얼로그 */}
      <Dialog open={!!remindBooking} onOpenChange={() => setRemindBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              {remindBooking?.remindSent ? '리마인드 재전송' : '리마인드 전송'}
            </DialogTitle>
            <DialogDescription>
              {remindBooking?.remindSent 
                ? '이미 리마인드가 전송된 예약입니다. 다시 전송하시겠습니까?' 
                : '고객에게 예약 리마인드를 전송합니다.'}
            </DialogDescription>
          </DialogHeader>
          {remindBooking && (
            <div className="bg-secondary/30 rounded-lg p-4 my-4">
              <p className="font-medium">{remindBooking.customerName}</p>
              <p className="text-sm text-muted-foreground">{remindBooking.customerPhone}</p>
              <p className="text-sm mt-2">{remindBooking.date} {remindBooking.time}</p>
              <p className="text-sm text-muted-foreground">{remindBooking.serviceName}</p>
              {remindBooking.petName && (
                <div className="flex items-center gap-2 text-sm mt-2">
                  <PawPrint className="w-4 h-4 text-amber-500" />
                  <span>{remindBooking.petName}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemindBooking(null)}>취소</Button>
            <Button 
              type="button" 
              onClick={() => remindBooking && sendRemind(remindBooking.id)}
              disabled={isSendingRemind}
              data-testid="button-confirm-remind"
            >
              {isSendingRemind ? <Loader2 className="w-4 h-4 animate-spin" /> : (remindBooking?.remindSent ? '재전송' : '전송')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 대시보드 일정 상세 다이얼로그 */}
      <Dialog open={!!dashboardDetailBooking} onOpenChange={() => setDashboardDetailBooking(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>예약 상세</DialogTitle>
          </DialogHeader>
          {dashboardDetailBooking && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-lg font-bold">{dashboardDetailBooking.time}</span>
                <Badge className="ml-auto bg-green-500 text-white">확정</Badge>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium">{dashboardDetailBooking.customerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-mono">{dashboardDetailBooking.customerPhone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Scissors className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{dashboardDetailBooking.serviceName}</span>
                </div>
                {(dashboardDetailBooking.petName || dashboardDetailBooking.petBreed) && (
                  <div className="flex items-center gap-3">
                    <PawPrint className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>
                      {dashboardDetailBooking.petName}
                      {dashboardDetailBooking.petBreed && ` (${dashboardDetailBooking.petBreed})`}
                    </span>
                  </div>
                )}
                {dashboardDetailBooking.memo && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{dashboardDetailBooking.memo}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 고객 상세 정보 다이얼로그 */}
      <CustomerDetailDialog 
        customerId={customerDetailId} 
        open={isCustomerDetailOpen} 
        onOpenChange={setIsCustomerDetailOpen} 
      />
    </div>
  );
}

// 고객 상세 정보 다이얼로그 컴포넌트
function CustomerDetailDialog({ customerId, open, onOpenChange }: { customerId: number | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: ['/api/customers', customerId],
    enabled: !!customerId && open,
  });
  
  if (!customerId) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            고객 상세 정보
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : customer ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">이름</span>
                <p className="font-medium">{customer.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">전화번호</span>
                <p className="font-medium font-mono">{customer.phone}</p>
              </div>
            </div>
            
            {(customer.petName || customer.petBreed) && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <PawPrint className="w-4 h-4 text-amber-500" />
                  반려동물 정보
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">이름</span>
                    <p className="font-medium">{customer.petName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">품종</span>
                    <p className="font-medium">{customer.petBreed || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">나이</span>
                    <p className="font-medium">{customer.petAge ? `${customer.petAge}살` : '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">몸무게</span>
                    <p className="font-medium">{customer.petWeight ? `${customer.petWeight}kg` : '-'}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                방문 정보
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">첫 방문일</span>
                  <p className="font-medium">{customer.firstVisitDate ? new Date(customer.firstVisitDate).toLocaleDateString('ko-KR') : '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">마지막 방문</span>
                  <p className="font-medium">{customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString('ko-KR') : '-'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">총 방문 횟수</span>
                  <p className="font-medium">{customer.visitCount}회</p>
                </div>
              </div>
            </div>
            
            {customer.memo && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  메모
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{customer.memo}</p>
              </div>
            )}
            
            {customer.behaviorNotes && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <PawPrint className="w-4 h-4" />
                  행동 특성
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{customer.behaviorNotes}</p>
              </div>
            )}
            
            {customer.specialNotes && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  특이사항
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{customer.specialNotes}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">고객 정보를 찾을 수 없습니다.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
