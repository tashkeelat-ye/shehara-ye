import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Bike,
  Check,
  Loader2,
  RefreshCw,
  ShieldOff,
  Store,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import {
  AdminCard,
  btnCls,
  btnGhostCls,
  inputCls,
} from "@/components/admin-ui";
import { supabase } from "@/integrations/supabase/client";

type TeamKind = "vendor" | "courier";

type TeamRow = {
  id: string;
  kind: TeamKind;
  name: string;
  phone: string | null;
  city: string | null;
  is_active: boolean;
  account_enabled: boolean;
  is_verified: boolean | null;
};

export const Route = createFileRoute("/admin/team")({
  component: AdminTeam,
});

function AdminTeam() {
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [kind, setKind] =
    useState<"all" | TeamKind>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [
        vendorsResult,
        couriersResult,
      ] = await Promise.all([
        supabase
          .from("vendors")
          .select(
            "id,name,phone,city,is_active,account_enabled,is_verified",
          )
          .order("name"),

        supabase
          .from("couriers")
          .select(
            "id,name,phone,city,is_active,account_enabled",
          )
          .order("name"),
      ]);

      if (vendorsResult.error) {
        throw vendorsResult.error;
      }

      if (couriersResult.error) {
        throw couriersResult.error;
      }

      const vendors =
        (vendorsResult.data ?? []) as Array<{
          id: string;
          name: string;
          phone: string | null;
          city: string | null;
          is_active: boolean;
          account_enabled: boolean;
          is_verified: boolean | null;
        }>;

      const couriers =
        (couriersResult.data ?? []) as Array<{
          id: string;
          name: string;
          phone: string | null;
          city: string | null;
          is_active: boolean;
          account_enabled: boolean;
        }>;

      setRows([
        ...vendors.map((row) => ({
          ...row,
          kind: "vendor" as const,
          is_verified:
            row.is_verified ?? null,
        })),

        ...couriers.map((row) => ({
          ...row,
          kind: "courier" as const,
          is_verified: null,
        })),
      ]);
    } catch (error) {
      console.error("[AdminTeam]", error);

      toast.error(
        "تعذر تحميل حسابات التجار وعمال التوصيل.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q =
      search.trim().toLowerCase();

    return rows.filter(
      (row) =>
        (kind === "all" ||
          row.kind === kind) &&
        (!q ||
          `${row.name} ${row.phone ?? ""} ${row.city ?? ""}`
            .toLowerCase()
            .includes(q)),
    );
  }, [rows, kind, search]);

  async function toggle(
    row: TeamRow,
    field:
      | "is_active"
      | "account_enabled",
  ) {
    const key =
      `${row.kind}:${row.id}:${field}`;

    setBusy(key);

    try {
      const next = !row[field];

      if (row.kind === "vendor") {
        const { error } =
          await supabase
            .from("vendors")
            .update({
              [field]: next,
            })
            .eq("id", row.id);

        if (error) {
          throw error;
        }
      } else {
        const { error } =
          await supabase
            .from("couriers")
            .update({
              [field]: next,
            })
            .eq("id", row.id);

        if (error) {
          throw error;
        }
      }

      setRows((current) =>
        current.map((item) =>
          item.id === row.id &&
          item.kind === row.kind
            ? {
                ...item,
                [field]: next,
              }
            : item,
        ),
      );

      toast.success(
        next
          ? "تم التفعيل بنجاح."
          : "تم التعطيل بنجاح.",
      );
    } catch (error) {
      console.error(
        "[AdminTeam] toggle",
        error,
      );

      toast.error(
        "تعذر تحديث الحساب. تحقق من صلاحيات الإدارة.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function verifyVendor(
    row: TeamRow,
  ) {
    if (row.kind !== "vendor") {
      return;
    }

    const key =
      `verify:${row.id}`;

    setBusy(key);

    try {
      const next =
        !row.is_verified;

      const { error } =
        await supabase
          .from("vendors")
          .update({
            is_verified: next,
          })
          .eq("id", row.id);

      if (error) {
        throw error;
      }

      setRows((current) =>
        current.map((item) =>
          item.id === row.id &&
          item.kind === "vendor"
            ? {
                ...item,
                is_verified: next,
              }
            : item,
        ),
      );

      toast.success(
        next
          ? "تم توثيق التاجر."
          : "تم إلغاء توثيق التاجر.",
      );
    } catch (error) {
      console.error(
        "[AdminTeam] verify",
        error,
      );

      toast.error(
        "تعذر تحديث حالة التوثيق.",
      );
    } finally {
      setBusy(null);
    }
  }

  const vendors =
    rows.filter(
      (row) => row.kind === "vendor",
    ).length;

  const couriers =
    rows.filter(
      (row) => row.kind === "courier",
    ).length;

  const enabled =
    rows.filter(
      (row) =>
        row.account_enabled &&
        row.is_active,
    ).length;

  return (
    <div
      dir="rtl"
      className="space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            إدارة الفريق التشغيلي
          </p>

          <h1 className="mt-1 text-xl font-black">
            التجار وعمال التوصيل
          </h1>

          <p className="mt-1 text-xs text-muted-foreground">
            تحديث حقيقي للحالة والتفعيل والتوثيق مباشرة من قاعدة البيانات.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className={btnGhostCls}
        >
          <RefreshCw className="h-4 w-4" />
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Metric
          icon={Store}
          label="التجار"
          value={vendors}
        />

        <Metric
          icon={Bike}
          label="عمال التوصيل"
          value={couriers}
        />

        <Metric
          icon={Check}
          label="حسابات نشطة"
          value={enabled}
        />
      </div>

      <AdminCard title="إدارة الحسابات">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            className={inputCls}
            placeholder="بحث بالاسم أو الهاتف أو المحافظة"
          />

          <div className="flex gap-2">
            {(
              [
                ["all", "الكل"],
                ["vendor", "التجار"],
                ["courier", "التوصيل"],
              ] as const
            ).map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setKind(value)
                  }
                  className={
                    kind === value
                      ? btnCls
                      : btnGhostCls
                  }
                >
                  {label}
                </button>
              ),
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            جارٍ التحميل...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            لا توجد حسابات مطابقة.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((row) => (
              <div
                key={`${row.kind}:${row.id}`}
                className="rounded-2xl border border-border/70 bg-secondary/20 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                      {row.kind ===
                      "vendor" ? (
                        <Store className="h-5 w-5" />
                      ) : (
                        <Bike className="h-5 w-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold">
                          {row.name}
                        </h2>

                        <Badge
                          label={
                            row.kind ===
                            "vendor"
                              ? "تاجر"
                              : "عامل توصيل"
                          }
                        />

                        <Badge
                          label={
                            row.is_active
                              ? "نشط"
                              : "متوقف"
                          }
                          danger={
                            !row.is_active
                          }
                        />

                        {row.kind ===
                        "vendor" ? (
                          <Badge
                            label={
                              row.is_verified
                                ? "موثق"
                                : "غير موثق"
                            }
                            danger={
                              !row.is_verified
                            }
                          />
                        ) : null}
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.phone ||
                          "بدون هاتف"}{" "}
                        •{" "}
                        {row.city ||
                          "بدون محافظة"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={
                        busy ===
                        `${row.kind}:${row.id}:is_active`
                      }
                      onClick={() =>
                        void toggle(
                          row,
                          "is_active",
                        )
                      }
                      className={
                        btnGhostCls
                      }
                    >
                      {row.is_active ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}

                      {row.is_active
                        ? "إيقاف النشاط"
                        : "تفعيل النشاط"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        busy ===
                        `${row.kind}:${row.id}:account_enabled`
                      }
                      onClick={() =>
                        void toggle(
                          row,
                          "account_enabled",
                        )
                      }
                      className={
                        btnGhostCls
                      }
                    >
                      {row.account_enabled ? (
                        <ShieldOff className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}

                      {row.account_enabled
                        ? "تعطيل الدخول"
                        : "تفعيل الدخول"}
                    </button>

                    {row.kind ===
                    "vendor" ? (
                      <button
                        type="button"
                        disabled={
                          busy ===
                          `verify:${row.id}`
                        }
                        onClick={() =>
                          void verifyVendor(
                            row,
                          )
                        }
                        className={
                          btnCls
                        }
                      >
                        {busy ===
                        `verify:${row.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <BadgeCheck className="h-4 w-4" />
                        )}

                        {row.is_verified
                          ? "إلغاء التوثيق"
                          : "توثيق"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <Icon className="h-5 w-5 text-primary" />

      <p className="mt-3 text-[10px] text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black">
        {value.toLocaleString("ar-EG")}
      </p>
    </div>
  );
}

function Badge({
  label,
  danger = false,
}: {
  label: string;
  danger?: boolean;
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
        danger
          ? "bg-destructive/10 text-destructive"
          : "bg-primary/10 text-primary"
      }`}
    >
      {label}
    </span>
  );
}
