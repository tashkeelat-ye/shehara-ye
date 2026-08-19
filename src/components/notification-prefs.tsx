import {
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";
import { BellRing } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import {
  fetchNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/prefs";

const ROWS: {
  key: keyof NotificationPrefs;
  label: string;
  hint: string;
}[] = [
  {
    key: "orders",
    label: "إشعارات الطلبات",
    hint: "تأكيد الطلب والتجهيز والشحن والتسليم",
  },
  {
    key: "promos",
    label: "العروض والتخفيضات",
    hint: "العروض والمنتجات الجديدة",
  },
  {
    key: "system",
    label: "إشعارات النظام",
    hint: "تحديثات الحساب والمحفظة والدفع",
  },
];

export function NotificationPrefsPanel() {
  const { user } = useAuth();

  const [prefs, setPrefs] =
    useState<NotificationPrefs | null>(
      null,
    );

  const [busy, setBusy] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user?.id) {
        return;
      }

      try {
        const result =
          await fetchNotificationPrefs(
            user.id,
          );

        if (!cancelled) {
          setPrefs(result);
        }
      } catch (error) {
        console.error(
          "[NotificationPrefs] Failed to load:",
          error,
        );

        if (!cancelled) {
          toast.error(
            "تعذر تحميل تفضيلات الإشعارات",
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function update(
    patch: Partial<NotificationPrefs>,
  ) {
    if (!prefs) {
      return;
    }

    const previous = prefs;
    const next: NotificationPrefs = {
      ...prefs,
      ...patch,
    };

    setPrefs(next);
    setBusy(true);

    try {
      await saveNotificationPrefs(next);
    } catch (error) {
      setPrefs(previous);

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر حفظ تفضيلات الإشعارات",
      );
    } finally {
      setBusy(false);
    }
  }

  async function enablePush() {
    if (
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      toast.error(
        "متصفحك لا يدعم إشعارات الجهاز",
      );
      return;
    }

    try {
      const permission =
        await Notification.requestPermission();

      if (permission === "granted") {
        await update({
          push_enabled: true,
        });

        toast.success(
          "تم تفعيل إشعارات الجهاز",
        );
        return;
      }

      await update({
        push_enabled: false,
      });

      toast.error(
        "لم يتم منح إذن الإشعارات",
      );
    } catch (error) {
      console.error(
        "[NotificationPrefs] Push permission error:",
        error,
      );

      toast.error(
        "تعذر تفعيل إشعارات الجهاز",
      );
    }
  }

  if (!user?.id) {
    return null;
  }

  if (!prefs) {
    return (
      <section className="rounded-3xl border border-border/70 bg-card p-4">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />

        <div className="mt-3 space-y-2">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-16 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <BellRing className="h-4 w-4" />
        </span>

        <div>
          <h2 className="text-sm font-bold text-foreground">
            تفضيلات الإشعارات
          </h2>

          <p className="text-[10px] text-muted-foreground">
            اختر الإشعارات التي تريد استقبالها
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {ROWS.map((row) => {
          const enabled = Boolean(
            prefs[row.key],
          );

          return (
            <li
              key={row.key}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/60 bg-background p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">
                  {row.label}
                </p>

                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {row.hint}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={row.label}
                disabled={busy}
                onClick={() =>
                  void update({
                    [row.key]:
                      !enabled,
                  } as Partial<NotificationPrefs>)
                }
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                  enabled
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow-sm transition-transform ${
                    enabled
                      ? "start-0.5"
                      : "start-[22px]"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>

      {!prefs.push_enabled ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void enablePush()
          }
          className="h-11 w-full rounded-2xl border border-primary bg-primary/5 text-xs font-bold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
        >
          تفعيل إشعارات الجهاز
        </button>
      ) : (
        <div className="rounded-2xl bg-primary/5 p-3 text-[10px] font-semibold text-primary">
          إشعارات الجهاز مفعّلة على هذا الهاتف.
        </div>
      )}
    </section>
  );
    }
