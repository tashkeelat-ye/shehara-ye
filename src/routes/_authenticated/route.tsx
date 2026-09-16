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
     * التاجر يستخدم لوحة التاجر بدلاً من حساب العميل
     * ==========================================================
     */

    if (
      isVendor &&
      currentPath === "/account"
    ) {
      throw redirect({
        to: "/merchant/dashboard",
        replace: true,
      });
    }

    /*
     * ==========================================================
     * حماية صفحة إدارة المنتجات
     * ==========================================================
     *
     * /merchant
     *
     * تبقى صفحة إدارة المنتجات الحالية.
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

    /*
     * ==========================================================
     * حماية لوحة التاجر الجديدة
     * ==========================================================
     *
     * /merchant/dashboard
     */

    if (
      currentPath ===
        "/merchant/dashboard" &&
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
