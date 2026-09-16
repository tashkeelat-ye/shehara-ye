import { createFileRoute } from "@tanstack/react-router";

import { OffersManager } from "@/components/admin/offers-manager";

export const Route = createFileRoute(
  "/admin/offers",
)({
  component: OffersManager,
});
