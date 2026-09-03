import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";

import { AdminCard, btnGhostCls } from "@/components/admin-ui";
import {
  fetchHomeSections,
  updateHomeSection,
  type HomeSection,
} from "@/lib/store";

export const Route = createFileRoute("/admin/home-sections")({
  component: AdminHomeSections,
});

function AdminHomeSections() {
  const [rows, setRows] = useState<HomeSection[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRows(await fetchHomeSections(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(row: HomeSection) {
    setBusy(true);
    try {
      await updateHomeSection(row.id, { is_active: !row.is_active });
      toast.success(row.is_active ? "تم إخفاء القسم" : "تم إظهار القسم");
      await load();
    } catch {
      toast.error("تعذّر التحديث");
    } finally {
      setBusy(false);
    }
  }

  async function move(row: HomeSection, dir: -1 | 1) {
    const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
    const index = sorted.findIndex((r) => r.id === row.id);
    const other = sorted[index + dir];
    if (!other) return;

    setBusy(true);
    try {
      await Promise.all([
        updateHomeSection(row.id, { sort_order: other.sort_order }),
        updateHomeSection(other.id, { sort_order: row.sort_order }),
      ]);
      await load();
    } catch {
      toast.error("تعذّر تغيير الترتيب");
    } finally {
      setBusy(false);
    }
  }

  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4" dir="rtl">
      <AdminCard title="ترتيب أقسام الصفحة الرئيسية">
        <p className="mb-3 text-xs text-muted-foreground">
          تحكّم بترتيب الأقسام وإظهارها في الصفحة الرئيسية للتطبيق.
        </p>

        <ul className="space-y-2">
          {sorted.map((row, index) => (
            <li
              key={row.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {row.title || row.section_key}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {row.section_key} · ترتيب {row.sort_order}
                  {row.is_active ? "" : " · مخفي"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  className={btnGhostCls}
                  disabled={busy || index === 0}
                  onClick={() => void move(row, -1)}
                  aria-label="تحريك للأعلى"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  className={btnGhostCls}
                  disabled={busy || index === sorted.length - 1}
                  onClick={() => void move(row, 1)}
                  aria-label="تحريك للأسفل"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  className={btnGhostCls}
                  disabled={busy}
                  onClick={() => void toggle(row)}
                  aria-label={row.is_active ? "إخفاء" : "إظهار"}
                >
                  {row.is_active ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>

        {sorted.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            لا توجد أقسام.
          </p>
        ) : null}
      </AdminCard>
    </div>
  );
}
