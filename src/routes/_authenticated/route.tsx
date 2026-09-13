import {
  createFileRoute,
  Outlet,
  redirect,
} from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute(
  "/_authenticated",
)({
  ssr: false,

  beforeLoad: async ({ location }) => {
    const { data, error } =
      await supabase.auth.getUser();

    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: {
          redirect: location.href,
        },
      });
    }

    /*
     * ==========================================================
     * Role-aware authenticated routing
     * ==========================================================
     *
     * نقرأ الدور مباشرة من user_roles بدلاً من الاعتماد
     * على حالة React الحالية فقط.
     *
     * هذا مهم خصوصاً بعد إنشاء حساب تاجر جديد، لأن Auth
     * Context قد يحتاج لحظات حتى يعيد تحميل الدور.
     */

    const {
      data: roleRows,
      error: roleError,
    } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    if (roleError) {
      console.error(
        "[AuthRoute] Failed to load user roles:",
        roleError,
      );
    }

    const roles = (roleRows ?? [])
      .map((row) => row.role)
      .filter(
        (
          value,
        ): value is
          | "customer"
          | "vendor"
          | "courier"
          | "admin" =>
          value === "customer" ||
          value === "vendor" ||
          value === "courier" ||
          value === "admin",
      );

    const isVendor =
      roles.includes("vendor");

    const isAdmin =
      roles.includes("admin");

    const isCourier =
      roles.includes("courier");

    const currentPath =
      location.pathname;

    /*
     * ==========================================================
     * التاجر لا يستخدم واجهة حساب العميل
     * ==========================================================
     *
     * إذا فتح:
     *
     * /account
     *
     * أو ضغط "حسابي"
     *
     * يتم تحويله مباشرة إلى:
     *
     * /merchant
     */

    if (
      isVendor &&
      currentPath === "/account"
    ) {
      throw redirect({
        to: "/merchant",
        replace: true,
      });
    }

    /*
     * ==========================================================
     * حماية لوحة التاجر
     * ==========================================================
     *
     * المستخدم غير التاجر لا يستطيع الدخول إلى:
     *
     * /merchant
     */

    if (
      currentPath === "/merchant" &&
      !isVendor
    ) {
      throw redirect({
        to: isAdmin
          ? "/admin"
          : isCourier
            ? "/courier"
            : "/account",
        replace: true,
      });
    }

    return {
      user: data.user,
      roles,
    };
  },

  component: () => <Outlet />,
});
