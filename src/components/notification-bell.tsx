import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const userId = user?.id ?? "";

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => fetchNotifications(userId),
    enabled: Boolean(userId),
    refetchInterval: 30000,
  });

  const unread = items.filter((n) => !n.is_read).length;
  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications", userId] });

  if (!user) {
    return (
      <Link
        to="/auth"
        aria-label="الإشعارات"
        className="grid h-10 w-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-accent"
      >
        <Bell className="h-5 w-5" />
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="الإشعارات"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-accent"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 left-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent-solid px-1 text-[11px] text-accent-solid-foreground">
            {unread.toLocaleString("ar-EG")}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="إغلاق الإشعارات"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-foreground/10"
          />
          <div className="absolute end-0 top-12 z-50 max-h-[70vh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-card p-3 shadow-card">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm text-foreground">الإشعارات</p>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={async () => {
                    await markAllNotificationsRead(userId);
                    await invalidate();
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-primary"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  تعليم الكل كمقروء
                </button>
              ) : null}
            </div>

            {items.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                لا توجد إشعارات بعد.
              </p>
            ) : (
              <ul className="space-y-2">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-xl border p-2.5 text-xs ${
                      n.is_read ? "border-border/60" : "border-primary/40 bg-brand-soft/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-foreground">{n.title}</p>
                        {n.body ? (
                          <p className="mt-0.5 text-muted-foreground">{n.body}</p>
                        ) : null}
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {new Date(n.created_at).toLocaleString("ar-EG")}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="حذف الإشعار"
                        onClick={async () => {
                          await deleteNotification(n.id);
                          await invalidate();
                        }}
                        className="shrink-0 text-muted-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {n.link_url ? (
                      <Link
                        to={n.link_url}
                        onClick={async () => {
                          setOpen(false);
                          await markNotificationRead(n.id);
                          await invalidate();
                        }}
                        className="mt-1.5 inline-block text-[11px] text-primary"
                      >
                        عرض التفاصيل
                      </Link>
                    ) : !n.is_read ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await markNotificationRead(n.id);
                          await invalidate();
                        }}
                        className="mt-1.5 text-[11px] text-primary"
                      >
                        تعليم كمقروء
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
