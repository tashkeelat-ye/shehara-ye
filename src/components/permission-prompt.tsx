import { useEffect, useState } from "react";
import { Bell, MapPin, X } from "lucide-react";

const KEY = "tashkilat:permissions:v1";

/** يطلب إذن الموقع والإشعارات عند أول تشغيل للتطبيق. */
export function PermissionPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.self !== window.top) return;
    if (localStorage.getItem(KEY)) return;
    const timer = window.setTimeout(() => setShow(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  function dismiss() {
    localStorage.setItem(KEY, "done");
    setShow(false);
  }

  async function allow() {
    localStorage.setItem(KEY, "done");
    try {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    } catch {
      /* ignore */
    }
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          localStorage.setItem(
            "tashkilat:last-location",
            JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          );
        },
        () => undefined,
        { timeout: 10000 },
      );
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] p-3 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:pb-4">
      <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-4 shadow-card">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <p className="text-sm text-foreground">لتجربة أفضل داخل تشكيلات</p>
          <button type="button" aria-label="إغلاق" onClick={dismiss} className="shrink-0 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="mt-2 space-y-1.5 text-[11px] text-muted-foreground">
          <li className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            تحديد موقعك لتسهيل التوصيل وحساب المسافة
          </li>
          <li className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 shrink-0 text-primary" />
            تنبيهك بحالة الطلبات والعروض الجديدة
          </li>
        </ul>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void allow()}
            className="h-11 rounded-2xl bg-primary text-xs text-primary-foreground"
          >
            السماح
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="h-11 rounded-2xl border border-border text-xs text-foreground"
          >
            لاحقًا
          </button>
        </div>
      </div>
    </div>
  );
}
