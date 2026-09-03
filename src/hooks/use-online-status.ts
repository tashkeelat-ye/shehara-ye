import { useEffect, useState } from "react";

/**
 * =========================================================
 * شهارة — التحقق من حالة الاتصال
 * =========================================================
 *
 * المبدأ: لا نعتبر المستخدم غير متصل إلا عندما يفشل
 * طلب الشبكة فعلياً (Network Error) أو يقول المتصفح
 * صراحةً إنه offline.
 *
 * أي استجابة من الخادم — حتى 401 أو 404 — تعني أن
 * الاتصال موجود، وهذا كان سبب ظهور رسالة "غير متصل"
 * بالخطأ داخل المعاينة.
 * =========================================================
 */

const CHECK_INTERVAL = 45_000;
const CONNECTIVITY_TIMEOUT = 6_000;

function browserSaysOffline(): boolean {
  return (
    typeof navigator !== "undefined" &&
    navigator.onLine === false
  );
}

async function checkRealConnectivity(): Promise<boolean> {
  if (typeof window === "undefined") return true;

  if (browserSaysOffline()) return false;

  const controller = new AbortController();

  const timeout = window.setTimeout(
    () => controller.abort(),
    CONNECTIVITY_TIMEOUT,
  );

  try {
    await fetch(`/favicon.png?c=${Date.now()}`, {
      method: "HEAD",
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    });

    /**
     * وصلنا إلى استجابة => الشبكة تعمل،
     * بغض النظر عن رمز الحالة.
     */
    return true;
  } catch {
    /**
     * قد يكون السبب انتهاء المهلة أو إلغاء الطلب
     * وليس انقطاع الشبكة، لذلك نعود إلى رأي المتصفح.
     */
    return !browserSaysOffline();
  } finally {
    window.clearTimeout(timeout);
  }
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let mounted = true;
    let checking = false;

    const verify = async () => {
      if (!mounted || checking) return;
      checking = true;
      try {
        const online = await checkRealConnectivity();
        if (mounted) setIsOnline(online);
      } finally {
        checking = false;
      }
    };

    const handleOnline = () => {
      if (mounted) setIsOnline(true);
    };

    const handleOffline = () => {
      void verify();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void verify();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    void verify();

    const interval = window.setInterval(() => {
      void verify();
    }, CHECK_INTERVAL);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return isOnline;
}
