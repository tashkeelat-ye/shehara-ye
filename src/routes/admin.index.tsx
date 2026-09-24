import { createFileRoute } from "@tanstack/react-router";
import { AdminOperationsCenter } from "@/components/admin/admin-operations-center";

export const Route = createFileRoute("/admin/")({
  component: AdminOperationsCenter,
});
