import { useEffect, useState } from "react";
import { RefreshCw, WifiOff, X } from "lucide-react";

import { useOnlineStatus } from "@/hooks/use-online-status";

/**
 * نافذة منبثقة تظهر فقط عند انقطاع الاتصال فعلياً،
 * مع زر "تجاهل" لإغلاقها وزر لإعادة المحاولة.
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isOnline) setDismissed(false);
  }, [isOnline]);

  if (isOnline || dismissed) return null;

  return (
    <div
      dir="rtl"
      role="alertdialog"
      aria-modal="true"
      aria-label="لا يوجد اتصال بالإنترنت"
      className="fixed inset-0 z-[200] grid place-items-center bg-black/50 p-5 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-2xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive">
          <WifiOff className="h-8 w-8" strokeWidth={2} />
        </div>

        <h2 className="mt-4 text-lg font-bold text-foreground">
          لا يوجد اتصال بالإنترنت
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          تحقّق من الشبكة ثم أعد المحاولة. يمكنك متابعة التصفح
          بالبيانات المحفوظة على جهازك.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-muted px-4 py-3 text-sm font-bold text-foreground active:scale-95"
          >
            <X className="h-4 w-4" />
            تجاهل
          </button>
        </div>
      </div>
    </div>
  );
}
