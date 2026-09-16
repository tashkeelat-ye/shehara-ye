import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, Truck, UserRound, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { fetchCouriers, type Courier } from "@/lib/store";
import {
  AdminCard,
  btnCls,
  btnGhostCls,
} from "@/components/admin-ui";

type Props = {
  orderId: string;
  courierId: string | null;
  onChanged?: () => void | Promise<void>;
};

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return "حدث خطأ غير معروف.";
}

export function CourierAssignmentPanel({
  orderId,
  courierId,
  onChanged,
}: Props) {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedCourier, setSelectedCourier] = useState(
    courierId ?? "",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCouriers = useCallback(async () => {
    setLoading(true);

    try {
      const result = await fetchCouriers(false);
      setCouriers(result);
    } catch (error) {
      console.error(
        "[CourierAssignmentPanel] load:",
        error,
      );

      toast.error(
        `تعذر تحميل عمال التوصيل: ${errorMessage(error)}`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCouriers();
  }, [loadCouriers]);

  useEffect(() => {
    setSelectedCourier(courierId ?? "");
  }, [courierId]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-courier-assignment-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        () => {
          void onChanged?.();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couriers",
        },
        () => {
          void loadCouriers();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId, loadCouriers, onChanged]);

  const activeCouriers = useMemo(
    () =>
      couriers.filter(
        (courier) =>
          courier.is_active &&
          courier.account_enabled,
      ),
    [couriers],
  );

  const currentCourier = useMemo(
    () =>
      couriers.find(
        (courier) => courier.id === courierId,
      ) ?? null,
    [couriers, courierId],
  );

  async function assign() {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      const { error } = await (
        supabase as any
      ).rpc("assign_order_courier_secure", {
        _order_id: orderId,
        _courier_id:
          selectedCourier.trim() || null,
      });

      if (error) {
        throw error;
      }

      toast.success(
        selectedCourier.trim()
          ? "تم إسناد الطلب لعامل التوصيل."
          : "تم إلغاء إسناد عامل التوصيل.",
      );

      await onChanged?.();
    } catch (error) {
      console.error(
        "[CourierAssignmentPanel] assign:",
        error,
      );

      toast.error(
        `تعذر تحديث الإسناد: ${errorMessage(error)}`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function clearAssignment() {
    setSelectedCourier("");

    if (saving) {
      return;
    }

    setSaving(true);

    try {
      const { error } = await (
        supabase as any
      ).rpc("assign_order_courier_secure", {
        _order_id: orderId,
        _courier_id: null,
      });

      if (error) {
        throw error;
      }

      toast.success("تم إلغاء إسناد الطلب.");

      await onChanged?.();
    } catch (error) {
      console.error(
        "[CourierAssignmentPanel] clear:",
        error,
      );

      toast.error(
        `تعذر إلغاء الإسناد: ${errorMessage(error)}`,
      );

      setSelectedCourier(courierId ?? "");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminCard title="عامل التوصيل">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/30 p-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Truck className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">
              العامل الحالي
            </p>

            <p className="truncate text-sm font-bold text-foreground">
              {currentCourier?.name ?? "غير مسند"}
            </p>

            {currentCourier ? (
              <p className="text-xs text-muted-foreground">
                {currentCourier.phone ?? "بدون رقم"}
                {" • "}
                {currentCourier.city ?? "بدون محافظة"}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`courier-${orderId}`}
            className="text-sm font-semibold text-foreground"
          >
            اختيار عامل التوصيل
          </label>

          <select
            id={`courier-${orderId}`}
            value={selectedCourier}
            disabled={loading || saving}
            onChange={(event) =>
              setSelectedCourier(event.target.value)
            }
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary"
          >
            <option value="">
              بدون عامل توصيل
            </option>

            {activeCouriers.map((courier) => (
              <option
                key={courier.id}
                value={courier.id}
              >
                {courier.name}
                {courier.city
                  ? ` — ${courier.city}`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={
              loading ||
              saving ||
              selectedCourier === (courierId ?? "")
            }
            className={`${btnCls} flex items-center gap-2`}
            onClick={() => void assign()}
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}

            {selectedCourier
              ? "حفظ الإسناد"
              : "إلغاء الإسناد"}
          </button>

          {courierId ? (
            <button
              type="button"
              disabled={saving}
              className={`${btnGhostCls} flex items-center gap-2`}
              onClick={() => void clearAssignment()}
            >
              <X className="h-4 w-4" />
              إلغاء العامل
            </button>
          ) : null}

          <div className="ms-auto flex items-center gap-2 text-xs text-muted-foreground">
            <UserRound className="h-4 w-4" />

            {activeCouriers.length.toLocaleString(
              "ar-EG",
            )}

            عامل متاح
          </div>
        </div>
      </div>
    </AdminCard>
  );
}
