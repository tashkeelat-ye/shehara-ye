import { createFileRoute } from "@tanstack/react-router";

import { PaymentRequestsManager } from "@/components/admin/payment-requests-manager";

export const Route = createFileRoute(
  "/admin/payment-requests",
)({
  component:
    PaymentRequestsManager,
});
