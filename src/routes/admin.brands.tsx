import { createFileRoute } from "@tanstack/react-router";
import { BrandsManager } from "@/components/admin/brands-manager";
import { AdminCard } from "@/components/admin-ui";

export const Route = createFileRoute("/admin/brands")({
  component: AdminBrandsPage,
});

function AdminBrandsPage() {
  return (
    <div className="space-y-4">
      <AdminCard title="إدارة الماركات التجارية">
        <BrandsManager />
      </AdminCard>
    </div>
  );
}
