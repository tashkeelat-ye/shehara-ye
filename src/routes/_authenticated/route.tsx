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
     * عامل التوصيل يدخل دائماً إلى لوحة
     * عامل التوصيل ولا يتم تحويله إلى
     * واجهة العميل.
     */
    if (
      isCourier &&
      currentPath === "/account"
    ) {
      throw redirect({
        to: "/courier",
        replace: true,
      });
    }

    /*
     * منع عامل التوصيل من دخول مسارات
     * الإدارة والتاجر.
     */
    if (
      isCourier &&
      (
        currentPath === "/admin" ||
        currentPath.startsWith("/admin/") ||
        currentPath === "/merchant" ||
        currentPath.startsWith("/merchant/")
      )
    ) {
      throw redirect({
        to: "/courier",
        replace: true,
      });
    }

    /*
     * التاجر.
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

    /*
     * منع العميل من الوصول إلى لوحة
     * الإدارة أو التاجر أو عامل التوصيل.
     */
    if (
      currentPath === "/courier" &&
      !isCourier
    ) {
      throw redirect({
        to: isAdmin
          ? "/admin"
          : isVendor
            ? "/merchant/dashboard"
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
