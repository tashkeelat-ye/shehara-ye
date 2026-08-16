import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[10000] flex min-h-10 items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-xs font-bold text-white shadow-lg"
    >
      <WifiOff
        className="h-4 w-4 shrink-0"
        aria-hidden="true"
      />

      <span>
        أنت غير متصل بالإنترنت — يتم عرض
        البيانات المحفوظة على جهازك
      </span>
    </div>
  );
}
