/**
 * =========================================================
 * شهارة — استرجاع الملفات القديمة (Stale Chunks)
 * =========================================================
 *
 * عند نشر نسخة جديدة، تكون ملفات النسخة القديمة المفتوحة
 * في المتصفح غير موجودة على الخادم، فتفشل عملية تحميل
 * أجزاء الصفحات (dynamic import) وتظهر شاشة بيضاء.
 *
 * الحل: إعادة تحميل الصفحة مرة واحدة فقط لجلب النسخة
 * الجديدة، مع حماية من الدخول في حلقة إعادة تحميل.
 * =========================================================
 */

const RELOAD_FLAG = "shehara:chunk-reloaded";

function looksLikeStaleChunk(message: string): boolean {
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("Unable to preload CSS")
  );
}

function reloadOnce() {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return;
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    /* التخزين غير متاح — نتابع الإعادة على أي حال */
  }
  window.location.reload();
}

export function installChunkReloadGuard() {
  if (typeof window === "undefined") return;

  const w = window as Window & { __sheharaChunkGuard?: boolean };
  if (w.__sheharaChunkGuard) return;
  w.__sheharaChunkGuard = true;

  // نجاح التحميل يعني أن النسخة الحالية سليمة
  window.addEventListener("load", () => {
    try {
      sessionStorage.removeItem(RELOAD_FLAG);
    } catch {
      /* لا شيء */
    }
  });

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadOnce();
  });

  window.addEventListener("error", (event) => {
    const message = String(event.message ?? "");
    if (looksLikeStaleChunk(message)) reloadOnce();
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error ? reason.message : String(reason ?? "");
    if (looksLikeStaleChunk(message)) reloadOnce();
  });
}
