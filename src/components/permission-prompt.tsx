import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, Check, ChevronLeft, MapPin, ShieldCheck, X } from "lucide-react";
import { registerPushNotifications } from "@/lib/push";

const KEY = "shehara:permissions:v2";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

function getNotificationState(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

function getLocationState(): PermissionState {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return "unsupported";
  }
  return "default";
}

type PermissionPromptProps = { enabled?: boolean };

export function PermissionPrompt({ enabled = true }: PermissionPromptProps) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notificationState, setNotificationState] =
    useState<PermissionState>("default");
  const [locationState, setLocationState] =
    useState<PermissionState>("default");

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (window.self !== window.top) return;
    if (localStorage.getItem(KEY)) return;

    setNotificationState(getNotificationState());
    setLocationState(getLocationState());

    const timer = window.setTimeout(() => setShow(true), 1800);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  const needsPermission = useMemo(
    () =>
      notificationState === "default" ||
      locationState === "default",
    [notificationState, locationState],
  );

  function dismiss() {
    localStorage.setItem(KEY, "dismissed");
    setShow(false);
  }

  async function requestPermissions() {
    if (busy) return;
    setBusy(true);

    try {
      if (
        "Notification" in window &&
        Notification.permission === "default"
      ) {
        const result = await Notification.requestPermission();
        setNotificationState(result);
      }

      if ("geolocation" in navigator) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              localStorage.setItem(
                "shehara:last-location",
                JSON.stringify({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  capturedAt: new Date().toISOString(),
                }),
              );
              setLocationState("granted");
              resolve();
            },
            () => {
              setLocationState("denied");
              resolve();
            },
            {
              enableHighAccuracy: true,
              maximumAge: 5 * 60 * 1000,
              timeout: 10000,
            },
          );
        });
      }

      localStorage.setItem(KEY, "done");

      // لا نطلب الإشعار خارج هذه النافذة. بعد منح الإذن،
      // نسجل Web Push فعليًا باستخدام اشتراك المستخدم الحالي.
      if (
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        void registerPushNotifications();
      }

      setShow(false);
    } finally {
      setBusy(false);
    }
  }

  if (!enabled || !show || !needsPermission) return null;

  return (
    <div
      className="fixed inset-0 z-[11000] flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shehara-permission-title"
      dir="rtl"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[#061C25]/65 backdrop-blur-md"
      />

      <div
        className="
          relative z-10 w-full max-w-[390px] overflow-hidden
          rounded-[30px] border border-white/15
          bg-white shadow-[0_30px_100px_rgba(0,0,0,.30)]
          animate-[permissionIn_360ms_cubic-bezier(.2,.8,.2,1)]
        "
      >
        <div className="relative overflow-hidden bg-[#0E4D64] px-6 pb-7 pt-7 text-white">
          <div
            aria-hidden="true"
            className="absolute -left-16 -top-20 h-44 w-44 rounded-full bg-[#D65A31]/25 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 -right-12 h-48 w-48 rounded-full bg-white/10 blur-2xl"
          />

          <button
            type="button"
            onClick={dismiss}
            aria-label="إغلاق"
            className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/15">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-white/65">
                تجربة شهارة
              </p>
              <h2
                id="shehara-permission-title"
                className="mt-1 text-xl font-extrabold tracking-tight"
              >
                دعنا نجعل تجربتك أسهل
              </h2>
            </div>
          </div>

          <p className="relative mt-5 text-sm leading-7 text-white/78">
            بعض صلاحيات الجهاز تساعد شهارة على تقديم تجربة توصيل وتنبيهات
            أكثر دقة. يمكنك تغييرها لاحقًا من إعدادات جهازك.
          </p>
        </div>

        <div className="space-y-3 p-5">
          <PermissionItem
            icon={<MapPin className="h-5 w-5" />}
            title="الموقع"
            description="لتحديد موقع التوصيل وحساب المسافة والرسوم بدقة."
            state={locationState}
          />

          <PermissionItem
            icon={<Bell className="h-5 w-5" />}
            title="الإشعارات"
            description="لتصلك تحديثات الطلبات والعروض والتنبيهات المهمة."
            state={notificationState}
          />

          <button
            type="button"
            onClick={() => void requestPermissions()}
            disabled={busy}
            className="
              mt-2 flex h-13 w-full items-center justify-center gap-2
              rounded-2xl bg-[#0E4D64] px-5 py-3.5
              text-sm font-extrabold text-white
              shadow-[0_12px_30px_rgba(14,77,100,.22)]
              transition active:scale-[.98] disabled:cursor-wait disabled:opacity-60
            "
          >
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                جارٍ طلب الأذونات...
              </>
            ) : (
              <>
                السماح والمتابعة
                <ChevronLeft className="h-4 w-4" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={dismiss}
            disabled={busy}
            className="h-11 w-full rounded-2xl text-xs font-bold text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
          >
            لاحقًا
          </button>

          <p className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            خصوصيتك أولاً — لا نستخدم الموقع إلا عند الحاجة
          </p>
        </div>
      </div>

      <style>{`
        @keyframes permissionIn {
          from {
            opacity: 0;
            transform: translateY(18px) scale(.94);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>
    </div>
  );
}

function PermissionItem({
  icon,
  title,
  description,
  state,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  state: PermissionState;
}) {
  const granted = state === "granted";

  return (
    <div
      className={[
        "flex items-center gap-3 rounded-2xl border p-3.5",
        granted
          ? "border-emerald-100 bg-emerald-50/70"
          : "border-slate-100 bg-slate-50/70",
      ].join(" ")}
    >
      <div
        className={[
          "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
          granted
            ? "bg-emerald-100 text-emerald-600"
            : "bg-[#0E4D64]/10 text-[#0E4D64]",
        ].join(" ")}
      >
        {granted ? <Check className="h-5 w-5" /> : icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-extrabold text-slate-800">{title}</p>
          <span
            className={[
              "rounded-full px-2 py-1 text-[9px] font-bold",
              granted
                ? "bg-emerald-100 text-emerald-700"
                : "bg-white text-slate-400",
            ].join(" ")}
          >
            {granted ? "مفعّل" : "اختياري"}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

export default PermissionPrompt;
