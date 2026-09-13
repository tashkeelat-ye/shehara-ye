import {
  createFileRoute,
} from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Search,
  Shield,
  User,
  Store,
  Ban,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import {
  AdminCard,
  btnGhostCls,
} from "@/components/admin-ui";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/db";

export const Route = createFileRoute(
  "/admin/users",
)({
  component: AdminUsers,
});

type Row = {
  id: string;
  full_name: string;
  phone: string | null;
  wallet_balance: number;
  is_disabled: boolean;
  created_at: string;
};

type RoleRow = {
  user_id: string;
  role: string;
};

type Filter =
  | "all"
  | "customer"
  | "vendor"
  | "admin"
  | "disabled";

function AdminUsers() {
  const [rows, setRows] =
    useState<Row[]>([]);

  const [roles, setRoles] =
    useState<Record<string, string[]>>(
      {},
    );

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<Filter>("all");

  const [loading, setLoading] =
    useState(true);

  const [busyId, setBusyId] =
    useState<string | null>(null);

  const load = useCallback(
    async () => {
      setLoading(true);

      try {
        const [
          profilesResult,
          rolesResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id,full_name,phone,wallet_balance,is_disabled,created_at",
            )
            .order("created_at", {
              ascending: false,
            })
            .returns<Row[]>(),

          supabase
            .from("user_roles")
            .select("user_id,role")
            .returns<RoleRow[]>(),
        ]);

        if (profilesResult.error) {
          throw profilesResult.error;
        }

        if (rolesResult.error) {
          throw rolesResult.error;
        }

        setRows(
          profilesResult.data ?? [],
        );

        const map: Record<
          string,
          string[]
        > = {};

        for (const row of
          rolesResult.data ?? []) {
          map[row.user_id] = [
            ...(map[row.user_id] ?? []),
            row.role,
          ];
        }

        setRoles(map);
      } catch (error) {
        console.error(
          "[AdminUsers] load failed:",
          error,
        );

        toast.error(
          "تعذّر تحميل المستخدمين.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const roleLabels: Record<
    string,
    string
  > = {
    admin: "إدارة",
    vendor: "تاجر",
    courier: "مندوب توصيل",
    customer: "عميل",
  };

  const roleOf = (
    id: string,
  ): string[] => {
    return roles[id]?.length
      ? roles[id]
      : ["customer"];
  };

  const filteredRows =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return rows.filter((row) => {
        const userRoles =
          roleOf(row.id);

        if (
          filter === "disabled" &&
          !row.is_disabled
        ) {
          return false;
        }

        if (
          filter !== "all" &&
          filter !== "disabled" &&
          !userRoles.includes(filter)
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        return (
          row.full_name
            .toLowerCase()
            .includes(query) ||
          String(row.phone ?? "")
            .toLowerCase()
            .includes(query)
        );
      });
    }, [
      rows,
      roles,
      search,
      filter,
    ]);

  const stats =
    useMemo(() => {
      let customers = 0;
      let vendors = 0;
      let admins = 0;
      let disabled = 0;

      for (const row of rows) {
        const current =
          roleOf(row.id);

        if (
          current.includes(
            "customer",
          )
        ) {
          customers++;
        }

        if (
          current.includes(
            "vendor",
          )
        ) {
          vendors++;
        }

        if (
          current.includes(
            "admin",
          )
        ) {
          admins++;
        }

        if (row.is_disabled) {
          disabled++;
        }
      }

      return {
        total: rows.length,
        customers,
        vendors,
        admins,
        disabled,
      };
    }, [rows, roles]);

  async function toggleDisabled(
    row: Row,
  ) {
    setBusyId(row.id);

    try {
      const {
        error,
      } = await supabase
        .from("profiles")
        .update({
          is_disabled:
            !row.is_disabled,
        })
        .eq("id", row.id);

      if (error) {
        throw error;
      }

      toast.success(
        row.is_disabled
          ? "تم تفعيل الحساب."
          : "تم تعطيل الحساب.",
      );

      await load();
    } catch (error) {
      console.error(
        "[AdminUsers] toggle failed:",
        error,
      );

      toast.error(
        "تعذّر تحديث حالة الحساب.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      dir="rtl"
      className="space-y-4"
    >
      <AdminCard title="إدارة المستخدمين">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <Stat
            icon={User}
            label="الإجمالي"
            value={stats.total}
          />

          <Stat
            icon={User}
            label="العملاء"
            value={stats.customers}
          />

          <Stat
            icon={Store}
            label="التجار"
            value={stats.vendors}
          />

          <Stat
            icon={Shield}
            label="الإدارة"
            value={stats.admins}
          />

          <Stat
            icon={Ban}
            label="المعطّلون"
            value={stats.disabled}
          />
        </div>
      </AdminCard>

      <AdminCard title="بحث وتصنيف المستخدمين">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            className="h-11 w-full rounded-2xl border border-border bg-secondary px-10 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <FilterButton
            active={
              filter === "all"
            }
            onClick={() =>
              setFilter("all")
            }
          >
            الكل
          </FilterButton>

          <FilterButton
            active={
              filter === "customer"
            }
            onClick={() =>
              setFilter(
                "customer",
              )
            }
          >
            العملاء
          </FilterButton>

          <FilterButton
            active={
              filter === "vendor"
            }
            onClick={() =>
              setFilter("vendor")
            }
          >
            التجار
          </FilterButton>

          <FilterButton
            active={
              filter === "admin"
            }
            onClick={() =>
              setFilter("admin")
            }
          >
            الإدارة
          </FilterButton>

          <FilterButton
            active={
              filter === "disabled"
            }
            onClick={() =>
              setFilter("disabled")
            }
          >
            المعطّلون
          </FilterButton>
        </div>
      </AdminCard>

      <AdminCard
        title={`المستخدمون (${filteredRows.length.toLocaleString(
          "ar-EG",
        )})`}
      >
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            className={btnGhostCls}
            onClick={() =>
              void load()
            }
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />
            تحديث
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            جارٍ تحميل المستخدمين...
          </p>
        ) : filteredRows.length ===
          0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            لا توجد نتائج مطابقة.
          </p>
        ) : (
          <ul className="space-y-2">
            {filteredRows.map(
              (row) => {
                const userRoles =
                  roleOf(row.id);

                return (
                  <li
                    key={row.id}
                    className="rounded-2xl border border-border/70 bg-card p-3"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        {userRoles.includes(
                          "vendor",
                        ) ? (
                          <Store className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {row.full_name ||
                            "بدون اسم"}
                        </p>

                        <p
                          dir="ltr"
                          className="text-xs text-muted-foreground"
                        >
                          {row.phone ??
                            "لا يوجد رقم"}
                        </p>

                        <p className="mt-1 text-[10px] text-muted-foreground">
                          إنشاء الحساب:{" "}
                          {new Date(
                            row.created_at,
                          ).toLocaleDateString(
                            "ar-YE",
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {userRoles.map(
                          (role) => (
                            <span
                              key={
                                role
                              }
                              className="rounded-full bg-primary/10 px-2 py-1 text-[10px] text-primary"
                            >
                              {roleLabels[
                                role
                              ] ??
                                role}
                            </span>
                          ),
                        )}
                      </div>

                      <div className="text-left">
                        <p className="text-xs font-semibold text-primary">
                          {formatPrice(
                            Number(
                              row.wallet_balance,
                            ) || 0,
                          )}
                        </p>

                        <p className="text-[10px] text-muted-foreground">
                          الرصيد
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2 py-1 text-[10px] ${
                          row.is_disabled
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {row.is_disabled
                          ? "معطّل"
                          : "نشط"}
                      </span>

                      <button
                        type="button"
                        className={btnGhostCls}
                        disabled={
                          busyId ===
                          row.id
                        }
                        onClick={() =>
                          void toggleDisabled(
                            row,
                          )
                        }
                      >
                        {busyId ===
                        row.id ? (
                          "جارٍ..."
                        ) : row.is_disabled ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            تفعيل
                          </>
                        ) : (
                          <>
                            <Ban className="h-4 w-4" />
                            تعطيل
                          </>
                        )}
                      </button>
                    </div>
                  </li>
                );
              },
            )}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <Icon className="h-4 w-4 text-primary" />

      <p className="mt-2 text-lg font-bold text-foreground">
        {value.toLocaleString(
          "ar-EG",
        )}
      </p>

      <p className="text-[10px] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-xs transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
