import { useState, useEffect, memo } from "react";
import { Link } from "wouter";
import { AlertTriangle, X } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";

const DISMISS_KEY = "trial-nudge-dismissed";
const DISMISS_EVENT = "trial-nudge-dismiss";

interface Props {
  className?: string;
}

export const TrialNudgeBanner = memo(function TrialNudgeBanner({ className }: Props) {
  const { data: sub } = useSubscription();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === "true",
  );

  useEffect(() => {
    const handler = () => setDismissed(true);
    window.addEventListener(DISMISS_EVENT, handler);
    return () => window.removeEventListener(DISMISS_EVENT, handler);
  }, []);

  if (!sub?.showPaymentNudge || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "true");
    window.dispatchEvent(new CustomEvent(DISMISS_EVENT));
  };

  return (
    <div
      className={`flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-800 ${className ?? ""}`}
    >
      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
      <span className="flex-1">
        무료체험 종료까지 <strong>{sub.daysUntilTrialEnd}일</strong> 남았습니다.{" "}
        <Link
          href="/admin/subscription"
          className="underline underline-offset-2 font-medium hover:opacity-75"
        >
          지금 구독하기 →
        </Link>
      </span>
      <button
        onClick={handleDismiss}
        className="p-1 rounded hover:bg-amber-200 transition-colors flex-shrink-0"
        aria-label="닫기"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
});
