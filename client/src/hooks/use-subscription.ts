import { useQuery } from "@tanstack/react-query";

interface SubscriptionData {
  status: string;
  isLocked: boolean;
  trialEndDate?: string | null;
  nextBillingDate?: string | null;
  daysUntilTrialEnd?: number | null;
  showPaymentNudge?: boolean;
}

export function useSubscription() {
  return useQuery<SubscriptionData>({
    queryKey: ["/api/subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscription");
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
  });
}

/** 무료 체험(trialing) 또는 유료 구독(active) 중인지 여부 */
export function useIsSubscriptionAccessible() {
  const { data, isLoading } = useSubscription();
  const userAccessible =
    data?.status === "active" || data?.status === "trialing";
  return { isLoading, userAccessible };
}
