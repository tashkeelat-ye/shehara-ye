import { WifiOff } from "lucide-react";

import { useOnlineStatus } from "@/hooks/use-online-status";

/**
 * =========================================================
 * شهارة للتسوق
 * Offline Indicator
 * =========================================================
 *
 * يظهر فقط عندما يتم التأكد من عدم توفر الاتصال.
 *
 * المزايا:
 * - متوافق مع RTL.
 * - متوافق مع الهواتف وPWA.
 * - يحترم Safe Area في الأجهزة الحديثة.
 * - لا يضيف مساحة فارغة داخل الصفحة.
 * - يستخدم هوية شهارة العنابية والذهبية.
 * - لا يمنع التفاعل مع محتوى التطبيق.
 * =========================================================
 */

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  /**
   * أثناء الاتصال:
   * لا نعرض أي عنصر على الإطلاق.
   */
  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      dir="rtl"
      className="
        shehara-offline-banner
        select-none
      "
    >
      <div
        className="
          flex
          w-full
          max-w-3xl
          items-center
          justify-center
          gap-2.5
          text-center
        "
      >
        {/* أيقونة حالة الاتصال */}
        <span
          className="
            flex
            h-7
            w-7
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-[#C99A3B]/15
            text-[#E0B85C]
            ring-1
            ring-[#E0B85C]/10
          "
          aria-hidden="true"
        >
          <WifiOff
            className="h-4 w-4"
            strokeWidth={2.25}
          />
        </span>

        {/* النص */}
        <span
          className="
            leading-5
            text-xs
            font-bold
            text-white
            sm:text-sm
          "
        >
          أنت غير متصل بالإنترنت

          <span
            className="
              mx-1.5
              text-[#E0B85C]
            "
            aria-hidden="true"
          >
            —
          </span>

          <span className="font-medium text-white/90">
            يتم عرض البيانات المحفوظة على جهازك
          </span>
        </span>
      </div>
    </div>
  );
}
