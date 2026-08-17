import {
  useEffect,
  useState,
} from "react";

/**
 * =========================================================
 * تشكيلات للتسوق
 * نظام التحقق من حالة الاتصال بالإنترنت
 *
 * لا نعتمد على navigator.onLine وحده لأن بعض أجهزة Android
 * قد تعطي نتيجة خاطئة رغم أن الاتصال يعمل فعلياً.
 * =========================================================
 */

const CONNECTIVITY_CHECK_PATH =
  "/favicon.png";


const CHECK_INTERVAL =
  30_000;


/**
 * الحالة الأولية:
 *
 * أثناء SSR لا يوجد navigator.
 * نعتبر المستخدم متصلاً مؤقتاً حتى يتم التحقق من الاتصال
 * من جهة المتصفح.
 */
function getInitialOnlineState(): boolean {
  if (
    typeof navigator ===
    "undefined"
  ) {
    return true;
  }

  /*
   * لا نستخدم navigator.onLine هنا كحقيقة نهائية.
   *
   * السبب:
   * بعض أجهزة Android / WebView قد تعيد false
   * رغم أن الإنترنت يعمل.
   */
  return true;
}


/**
 * =========================================================
 * اختبار الاتصال الحقيقي
 * =========================================================
 *
 * نطلب ملفاً من نفس النطاق مع Cache Busting.
 *
 * يتم استخدام ?connectivity= حتى لا يستطيع Service Worker
 * الاعتماد على نسخة مخزنة مسبقاً.
 */
async function checkRealConnectivity(): Promise<boolean> {
  if (
    typeof window ===
      "undefined" ||
    typeof navigator ===
      "undefined"
  ) {
    return true;
  }


  /*
   * إذا كان المتصفح يؤكد الاتصال، لا نحتاج إلى اختبار
   * خارجي في كل مرة.
   *
   * لكن عندما يقول navigator.onLine = false،
   * نجري الاختبار الفعلي قبل إظهار حالة عدم الاتصال.
   */
  const url =
    `${CONNECTIVITY_CHECK_PATH}?connectivity=${Date.now()}`;


  const controller =
    new AbortController();


  const timeout =
    window.setTimeout(
      () => {
        controller.abort();
      },
      7000,
    );


  try {
    const response =
      await fetch(
        url,
        {
          method: "GET",

          cache: "no-store",

          credentials: "omit",

          redirect: "follow",

          signal:
            controller.signal,
        },
      );


    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(
      timeout,
    );
  }
}


/**
 * =========================================================
 * Hook
 * =========================================================
 */
export function useOnlineStatus(): boolean {
  const [
    isOnline,
    setIsOnline,
  ] =
    useState<boolean>(
      getInitialOnlineState,
    );


  useEffect(() => {
    let mounted =
      true;


    let checking =
      false;


    /**
     * منع تنفيذ أكثر من اختبار في نفس الوقت.
     */
    const verifyConnection =
      async () => {
        if (
          !mounted ||
          checking
        ) {
          return;
        }


        checking =
          true;


        try {
          const online =
            await checkRealConnectivity();


          if (
            !mounted
          ) {
            return;
          }


          setIsOnline(
            online,
          );
        } finally {
          checking =
            false;
        }
      };


    /**
     * عند ظهور حدث online:
     *
     * نعتبر الاتصال متاحاً فوراً حتى لا يظهر الشريط
     * بعد عودة الشبكة لفترة غير ضرورية.
     *
     * ثم نتحقق فعلياً.
     */
    const handleOnline =
      () => {
        if (
          !mounted
        ) {
          return;
        }


        setIsOnline(
          true,
        );


        void verifyConnection();
      };


    /**
     * عند حدث offline:
     *
     * لا نعرض الشريط مباشرة.
     *
     * أولاً نتحقق من الاتصال الحقيقي لأن بعض الأجهزة
     * قد تطلق حدث offline بشكل غير دقيق.
     */
    const handleOffline =
      () => {
        void verifyConnection();
      };


    window.addEventListener(
      "online",
      handleOnline,
    );


    window.addEventListener(
      "offline",
      handleOffline,
    );


    /**
     * التحقق عند تحميل التطبيق.
     *
     * مهم جداً لأن المستخدم قد يفتح التطبيق مباشرة
     * أثناء انقطاع الإنترنت دون أن يصدر حدث offline.
     */
    void verifyConnection();


    /**
     * إعادة التحقق دورياً.
     *
     * هذا مفيد في الحالات التي ينقطع فيها الاتصال
     * دون أن يرسل النظام حدث offline.
     */
    const interval =
      window.setInterval(
        () => {
          void verifyConnection();
        },
        CHECK_INTERVAL,
      );


    /**
     * عند عودة التطبيق إلى الواجهة.
     */
    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void verifyConnection();
        }
      };


    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );


    return () => {
      mounted =
        false;


      window.clearInterval(
        interval,
      );


      window.removeEventListener(
        "online",
        handleOnline,
      );


      window.removeEventListener(
        "offline",
        handleOffline,
      );


      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, []);


  return isOnline;
}
