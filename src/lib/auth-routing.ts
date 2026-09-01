import type { AccountRole } from "@/lib/auth-context";

/**
 * الصفحة الرئيسية لكل نوع حساب.
 *
 * الدور الحقيقي يأتي من user_roles
 * وليس من user_metadata.
 */
export function getRoleHome(
  role: AccountRole | null | undefined,
): string {
  switch (role) {
    case "admin":
      return "/admin";

    case "courier":
      return "/courier";

    case "vendor":
      // لا توجد لوحة تاجر مستقلة في المشروع حالياً.
      return "/account";

    case "customer":
    default:
      return "/account";
  }
}

/**
 * تحديد الصفحة التي يسمح للمستخدم بالعودة إليها
 * بعد تسجيل الدخول.
 *
 * الهدف:
 * - المحافظة على redirect للصفحات العادية.
 * - منع courier من الذهاب إلى admin.
 * - منع customer/vendor من الذهاب إلى المسارات الخاصة.
 * - منع open redirect خارج التطبيق.
 */
export function getSafePostAuthDestination(
  role: AccountRole | null | undefined,
  requestedRedirect?: string,
): string {
  const home = getRoleHome(role);

  if (
    !requestedRedirect ||
    !requestedRedirect.startsWith("/")
  ) {
    return home;
  }

  /**
   * المدير يمكنه العودة إلى أي صفحة داخل /admin.
   */
  if (role === "admin") {
    if (
      requestedRedirect === "/admin" ||
      requestedRedirect.startsWith("/admin/")
    ) {
      return requestedRedirect;
    }

    return home;
  }

  /**
   * عامل التوصيل يمكنه العودة إلى /courier فقط.
   */
  if (role === "courier") {
    if (
      requestedRedirect === "/courier" ||
      requestedRedirect.startsWith("/courier/")
    ) {
      return requestedRedirect;
    }

    return home;
  }

  /**
   * العميل والتاجر لا يسمح لهما بالدخول
   * إلى مناطق الإدارة أو التوصيل.
   */
  if (
    requestedRedirect === "/admin" ||
    requestedRedirect.startsWith("/admin/") ||
    requestedRedirect === "/courier" ||
    requestedRedirect.startsWith("/courier/")
  ) {
    return home;
  }

  return requestedRedirect;
}
