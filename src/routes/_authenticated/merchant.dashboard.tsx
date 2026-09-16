import { createFileRoute } from "@tanstack/react-router";

import { MerchantDashboard } from "@/components/merchant/merchant-dashboard";

export const Route = createFileRoute(
  "/_authenticated/merchant/dashboard",
)({
  head: () => ({
    meta: [
      {
        title: "لوحة التاجر | شهارة",
      },
      {
        name: "description",
        content:
          "لوحة إدارة التاجر في شهارة لإدارة المنتجات والطلبات والمبيعات والمحفظة.",
      },
    ],
  }),

  component: MerchantDashboardPage,
});

function MerchantDashboardPage() {
  return <MerchantDashboard />;
}
