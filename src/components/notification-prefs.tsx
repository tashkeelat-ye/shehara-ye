import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchNotificationPrefs, saveNotificationPrefs, type NotificationPrefs } from "@/lib/prefs";

const ROWS: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: "orders", label: "إشعارات الطلبات", hint: "تأكيد الطلب، التجهيز، الشحن والتسليم" },
  { key: "promos", label: "العروض والتخفيضات", hint: "أحدث العروض والمنتجات الجديدة" },
  { key: "system", label: "إشعارات النظام", hint: "تحديثات الحساب والمحفظة والدفع" },
];

export function NotificationPrefsPanel() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    void fetchNotificationPrefs(user.id).then(setPrefs);
  }, [user?.id]);

  async function update(patch: Partial<NotificationPrefs>) {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setBusy(true);
    try {
      await saveNotificationPrefs(next);
    } catch {
      toast.error("تعذّر حفظ التفضيلات");
    } finally {
      setBusy(false);
    }
  }

  async function enablePush() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("متصفحك لا يدعم الإشعارات");
      return;
    }
    const result = await Notification.requestPermission();
    if (result === "granted") {
      await update({ push_enabled: true });
      toast.success("تم تفعيل إشعارات الجهاز");
    } else {
      await update({ push_enabled: false });
      toast.error("لم يتم منح إذن الإشعارات");
    }
  }

  if (!prefs) {
    return <div className="h-24 animate-pulse rounded-3xl bg-muted" />;
  }

  return (
    <section className="space-y-3 rounded-3xl border border-border/70 bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm text-foreground">
        <BellRing className="h-4 w-4 text-primary" />
        تفضيلات الإشعارات
      </h2>
      <ul className="space-y-2">
        {ROWS.map((row) => (
          <li
            key={row.key}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/60 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-xs text-foreground">{row.label}</p>
              <p className="truncate text-[11px] text-muted-foreground">{row.hint}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(prefs[row.key])}
              aria-label={row.label}
              disabled={busy}
              onClick={() => void update({ [row.key]: !prefs[row.key] } as Partial<NotificationPrefs>)}
              className={`h-6 w-11 shrink-0 rounded-full transition-colors ${
                prefs[row.key] ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-card transition-transform ${
                  prefs[row.key] ? "translate-x-0.5" : "-translate-x-5"
                }`}
              />
            </button>
          </li>
        ))}
      </ul>
      {!prefs.push_enabled ? (
        <button
          type="button"
          onClick={() => void enablePush()}
          className="h-11 w-full rounded-2xl border border-primary text-xs text-primary"
        >
          تفعيل إشعارات الجهاز
        </button>
      ) : (
        <p className="text-[11px] text-muted-foreground">إشعارات الجهاز مفعّلة على هذا الهاتف.</p>
      )}
    </section>
  );
}
