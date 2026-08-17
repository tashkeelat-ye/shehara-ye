import {
  WifiOff,
} from "lucide-react";

import {
  useOnlineStatus,
} from "@/hooks/use-online-status";


/**
 * =========================================================
 * تشكيلات للتسوق
 * Offline Indicator
 *
 * يظهر فقط عند انقطاع الاتصال الحقيقي.
 * يختفي تماماً أثناء الاتصال.
 * =========================================================
 */

export function OfflineIndicator() {
  const isOnline =
    useOnlineStatus();


  /*
   * أثناء الاتصال:
   *
   * لا نعرض أي عنصر إطلاقاً.
   *
   * هذا مهم حتى لا يترك الشريط مساحة فارغة
   * في أسفل الشاشة.
   */
  if (
    isOnline
  ) {
    return null;
  }


  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      dir="rtl"
      className="
        fixed
        inset-x-0
        bottom-0
        z-[10000]
        flex
        min-h-11
        items-center
        justify-center
        gap-2
        border-t
        border-[#E0B85C]/30
        bg-[#4A1525]
        px-4
        py-2.5
        text-center
        text-xs
        font-bold
        text-white
        shadow-[0_-4px_18px_rgba(74,21,37,0.18)]
        transition-all
        duration-300
      "
    >

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
        "
      >
        <WifiOff
          className="h-4 w-4"
          aria-hidden="true"
        />
      </span>


      <span className="leading-5">
        أنت غير متصل بالإنترنت
        <span className="mx-1 text-[#E0B85C]">
          —
        </span>
        يتم عرض البيانات المحفوظة على جهازك
      </span>

    </div>
  );
}
