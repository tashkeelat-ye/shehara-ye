import {
  createFileRoute,
} from "@tanstack/react-router";

import { AccountManagement } from "@/components/admin/account-management";

export const Route =
  createFileRoute(
    "/admin/users",
  )({
    component:
      AdminUsers,
  });

function AdminUsers() {
  return (
    <div
      dir="rtl"
      className="w-full"
    >
      <AccountManagement
        initialSection="users"
      />
    </div>
  );
}
