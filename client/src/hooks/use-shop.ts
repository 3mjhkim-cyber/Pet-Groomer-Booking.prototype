import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CreateBookingInput } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export function useServices() {
  return useQuery({
    queryKey: ['/api/shop/services'],
    queryFn: async () => {
      const res = await fetch('/api/shop/services');
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
  });
}

export function useBookings() {
  return useQuery({
    queryKey: [api.bookings.list.path],
    queryFn: async () => {
      const res = await fetch(api.bookings.list.path);
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return api.bookings.list.responses[200].parse(await res.json());
    },
    retry: false,
  });
}

export function useBooking(id: number) {
  return useQuery({
    queryKey: ['/api/bookings', id],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${id}`);
      if (!res.ok) throw new Error("Failed to fetch booking");
      return res.json();
    },
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: [api.customers.list.path],
    queryFn: async () => {
      const res = await fetch(api.customers.list.path);
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return api.customers.list.responses[200].parse(await res.json());
    },
    retry: false,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (data: CreateBookingInput) => {
      const validated = api.bookings.create.input.parse(data);
      
      const res = await fetch(api.bookings.create.path, {
        method: api.bookings.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "예약 생성 실패");
      }

      return api.bookings.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      toast({
        title: "예약 신청 완료!",
        description: "예약이 접수되었습니다. 업체 승인 후 확정됩니다.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "예약 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useApproveBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/bookings/${id}/approve`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error("Failed to approve booking");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      toast({ title: "예약 승인됨", description: "예약이 승인되었습니다." });
    },
  });
}

export function useRejectBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/bookings/${id}/reject`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error("Failed to reject booking");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      toast({ title: "예약 거절됨", description: "예약이 거절되었습니다.", variant: "destructive" });
    },
  });
}

export function useRequestDeposit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/bookings/${id}/deposit-request`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error("Failed to request deposit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      toast({ title: "예약금 요청됨", description: "고객에게 예약금 요청이 전송되었습니다." });
    },
  });
}

export function useConfirmDeposit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/bookings/${id}/deposit-confirm`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error("Failed to confirm deposit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({ title: "입금 확인됨", description: "예약금 입금이 확인되었습니다." });
    },
  });
}

export function useSearchCustomers(query: string) {
  return useQuery({
    queryKey: ['/api/customers/search', query],
    queryFn: async () => {
      if (!query || query.length < 1) return [];
      const res = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed to search customers");
      return res.json();
    },
    enabled: query.length >= 1,
  });
}

export function useCustomerHistory(phone: string | null) {
  return useQuery({
    queryKey: ['/api/customers/history', phone],
    queryFn: async () => {
      if (!phone) return null;
      const res = await fetch(`/api/customers/${encodeURIComponent(phone)}/history`);
      if (!res.ok) throw new Error("Failed to fetch customer history");
      return res.json();
    },
    enabled: !!phone,
  });
}

// 예약 취소
export function useCancelBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/bookings/${id}/cancel`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) throw new Error("예약 취소에 실패했습니다.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      toast({ title: "예약 취소됨", description: "예약이 취소되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "취소 실패", description: error.message, variant: "destructive" });
    },
  });
}

// 예약 정보 수정 (날짜, 시간, 서비스)
export function useUpdateBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { date?: string; time?: string; serviceId?: number } }) => {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "예약 수정에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      toast({ title: "예약 수정됨", description: "예약 정보가 수정되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "수정 실패", description: error.message, variant: "destructive" });
    },
  });
}

// 고객 정보 수정
export function useUpdateBookingCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { customerName?: string; customerPhone?: string } }) => {
      const res = await fetch(`/api/bookings/${id}/customer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("고객 정보 수정에 실패했습니다.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      toast({ title: "고객 정보 수정됨", description: "고객 정보가 수정되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "수정 실패", description: error.message, variant: "destructive" });
    },
  });
}

// 예약 가능 시간 조회
export function useAvailableTimeSlots(slug: string, date: string, duration: number = 60) {
  return useQuery({
    queryKey: ['/api/shops', slug, 'available-times', date, duration],
    queryFn: async () => {
      if (!slug || !date) return [];
      const res = await fetch(`/api/shops/${slug}/available-times/${date}?duration=${duration}`);
      if (!res.ok) throw new Error("Failed to fetch available times");
      return res.json();
    },
    enabled: !!slug && !!date,
  });
}
