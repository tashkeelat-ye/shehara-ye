import {
  useEffect,
  useState,
} from "react";

/**
 * =========================================================
 * شهارة للتسوق
 * نظام موثوق للتحقق من حالة الاتصال بالإنترنت
 * =========================================================
 *
 * الهدف:
 * - عدم الاعتماد على navigator.onLine وحده.
 * - عدم إظهار Offline Banner بسبب نتيجة خاطئة من الجهاز.
 * - التعامل مع Android / WebView / PWA.
 * - عدم إنشاء عدة طلبات اتصال في الوقت نفسه.
 * - إعادة التحقق عند عودة التطبيق للواجهة.
 * =========================================================
 */

/**
 * ملف صغير من نفس الموقع يستخدم لاختبار الاتصال.
 *
 * يفضل أن يكون هذا الملف موجوداً دائماً في public.
 */
const CONNECTIVITY_CHECK_PATH =
  "/favicon.png";

/**
 * كل 30 ثانية نعيد التحقق عند بقاء التطبيق مفتوحاً.
 */
const CHECK_INTERVAL =
  30_000;

/**
 * مهلة اختبار الاتصال.
 *
 * لا نريد أن يبقى Offline Banner معلقاً بسبب طلب
 * شبكة لا يستجيب.
 */
const CONNECTIVITY_TIMEOUT =
  5_000;

/**
 * عدد المحاولات عند اكتشاف انقطاع الاتصال.
 *
 * المحاولة الإضافية تمنع ظهور الشريط بسبب انقطاع
 * مؤقت جداً أو نتيجة شبكة غير مستقرة.
 */
const OFFLINE_RETRY_COUNT =
  2;

/**
 * مدة الانتظار بين محاولات التحقق.
 */
const OFFLINE_RETRY_DELAY =
  350;

/**
 * =========================================================
 * الحالة الأولية
 * =========================================================
 *
 * أثناء SSR لا يوجد navigator.
 *
 * وحتى في المتصفح لا نستخدم navigator.onLine كحقيقة
 * نهائية، لأن بعض أجهزة Android / WebView قد تعطي
 * نتيجة غير دقيقة.
 */
function getInitialOnlineState(): boolean {
  if (
    typeof navigator ===
    "undefined"
  ) {
    return true;
  }

  /**
   * إذا كان المتصفح يقول إنه غير متصل، نبدأ بحالة
   * غير متصل مؤقتاً.
   *
   * سيقوم verifyConnection() مباشرة بعد mount
   * بالتحقق من الاتصال الحقيقي.
   */
  return navigator.onLine !== false;
}

/**
 * =========================================================
 * انتظار بسيط
 * =========================================================
 */
function wait(
  milliseconds: number,
): Promise<void> {
  return new Promise(
    (resolve) => {
      window.setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

/**
 * =========================================================
 * اختبار الاتصال الحقيقي
 * =========================================================
 *
 * نستخدم fetch إلى ملف من نفس النطاق.
 *
 * لا نستخدم خدمة خارجية لأن:
 * - المتجر قد يعمل داخل PWA.
 * - بعض الشبكات قد تمنع خدمات معينة.
 * - المطلوب هو معرفة قدرة التطبيق على الوصول إلى
 *   موارده الأساسية.
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

  /**
   * إذا كان المتصفح يعرف صراحةً أن الشبكة غير متصلة،
   * لا داعي لانتظار fetch في الحالة الطبيعية.
   *
   * لكننا لا نعتمد على هذه القيمة وحدها؛
   * الحالات الأخرى ستصل إلى الاختبار الحقيقي.
   */
  if (
    navigator.onLine ===
    false
  ) {
    return false;
  }

  const controller =
    new AbortController();

  const timeout =
    window.setTimeout(
      () => {
        controller.abort();
      },
      CONNECTIVITY_TIMEOUT,
    );

  const url =
    `${CONNECTIVITY_CHECK_PATH}?connectivity=${Date.now()}`;

  try {
    const response =
      await fetch(
        url,
        {
          method: "GET",

          /**
           * منع الاعتماد على نتيجة Cache قديمة.
           */
          cache: "no-store",

          /**
           * لا نحتاج Cookies لاختبار الاتصال.
           */
          credentials: "omit",

          redirect: "follow",

          signal:
            controller.signal,
        },
      );

    /**
     * أي استجابة HTTP ناجحة تعني أن التطبيق استطاع
     * الوصول إلى الخادم.
     */
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
 * التحقق مع إعادة المحاولة
 * =========================================================
 *
 * نستخدمه خصوصاً عندما يطلق الجهاز حدث offline.
 *
 * السبب:
 * قد يحدث انتقال مؤقت بين شبكتين Wi-Fi / Mobile
 * أو تغير لحظي في حالة الاتصال.
 */
async function verifyWithRetry(): Promise<boolean> {
  const firstCheck =
    await checkRealConnectivity();

  if (firstCheck) {
    return true;
  }

  /**
   * إذا كان الجهاز يقول إنه offline فعلاً،
   * لا نحتاج إلى إعادة المحاولة عدة مرات.
   */
  if (
    typeof navigator !==
      "undefined" &&
    navigator.onLine ===
      false
  ) {
    return false;
  }

  for (
    let attempt = 0;
    attempt < OFFLINE_RETRY_COUNT;
    attempt += 1
  ) {
    await wait(
      OFFLINE_RETRY_DELAY,
    );

    const retryResult =
      await checkRealConnectivity();

    if (retryResult) {
      return true;
    }
  }

  return false;
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
     * =====================================================
     * التحقق من الاتصال
     * =====================================================
     */
    const verifyConnection =
      async () => {
        /**
         * منع الطلبات المتزامنة.
         */
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
            await verifyWithRetry();

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
     * =====================================================
     * حدث online
     * =====================================================
     *
     * نعتبر الاتصال عاد فوراً حتى لا يبقى Offline Banner
     * ظاهراً بعد عودة الشبكة.
     *
     * ثم نجري اختباراً فعلياً للتأكد.
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
     * =====================================================
     * حدث offline
     * =====================================================
     *
     * لا نعرض الشريط مباشرة.
     *
     * نتحقق أولاً من الاتصال الحقيقي لتقليل الحالات
     * الكاذبة.
     */
    const handleOffline =
      () => {
        if (
          !mounted
        ) {
          return;
        }

        void verifyConnection();
      };

    /**
     * =====================================================
     * visibilitychange
     * =====================================================
     *
     * مهم جداً للـPWA:
     * عندما يعود المستخدم للتطبيق بعد تركه في الخلفية،
     * نعيد التحقق من الشبكة.
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

    /**
     * =====================================================
     * pageshow
     * =====================================================
     *
     * يفيد في حالات BFCache والتنقل بين صفحات المتصفح.
     */
    const handlePageShow =
      () => {
        void verifyConnection();
      };

    /**
     * =====================================================
     * focus
     * =====================================================
     *
     * إعادة التحقق عند عودة نافذة المتصفح للتركيز.
     */
    const handleFocus =
      () => {
        void verifyConnection();
      };

    /**
     * =====================================================
     * تسجيل الأحداث
     * =====================================================
     */
    window.addEventListener(
      "online",
      handleOnline,
    );

    window.addEventListener(
      "offline",
      handleOffline,
    );

    window.addEventListener(
      "focus",
      handleFocus,
    );

    window.addEventListener(
      "pageshow",
      handlePageShow,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    /**
     * =====================================================
     * تحقق أولي
     * =====================================================
     *
     * مهم جداً عند فتح التطبيق مباشرة أثناء انقطاع
     * الإنترنت.
     */
    void verifyConnection();

    /**
     * =====================================================
     * تحقق دوري
     * =====================================================
     *
     * بعض الأجهزة قد تفقد الاتصال دون إطلاق حدث
     * offline بشكل صحيح.
     */
    const interval =
      window.setInterval(
        () => {
          void verifyConnection();
        },
        CHECK_INTERVAL,
      );

    /**
     * =====================================================
     * Cleanup
     * =====================================================
     */
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

      window.removeEventListener(
        "focus",
        handleFocus,
      );

      window.removeEventListener(
        "pageshow",
        handlePageShow,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, []);

  return isOnline;
}
