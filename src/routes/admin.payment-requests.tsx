import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, btnCls, btnGhostCls } from "@/components/admin-ui";
import { formatPrice } from "@/lib/db";
import { formatDate, type PaymentRequest } from "@/lib/store";

export const Route = createFileRoute("/admin/payment-requests")({
  component: AdminPaymentRequests;
});

function AdminPaymentRequests() {
  return null;
}
