import { createFileRoute } from "@tanstack/react-router";

import { VendorLogoEditor } from "@/components/merchant/vendor-logo-editor";
import { MerchantDashboard } from "@/components/merchant/merchant-dashboard";

export const Route = createFileRoute(
  "/_authenticated/merchant_/dashboard",
)({
  head: () => ({
    meta: [
      {
        title: "لوحة التاجر | شهارة",
      },
      {
        name: "description",
        content:
          "لوحة إدارة التاجر في شهارة لإدارة المنتجات والطلبات والمبيعات والمحفظة وهوية المتجر.",
      },
    ],
  }),

  component: MerchantDashboardPage,
});

function MerchantDashboardPage() {
  return (
    <div
      dir="rtl"
      className="mx-auto w-full max-w-7xl space-y-4 p-4 pb-10 sm:p-5"
    >
      <VendorLogoEditor />

      <MerchantDashboard />
    </div>
  );
}
