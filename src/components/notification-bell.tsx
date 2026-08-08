import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
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
  const [mounted, setMounted] = useState(false);
  const qc = useQueryClient();
  const userId = user?.id ?? "";

  // التأكد من جاهزية DOM لاستخدام Portal
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // محتوى النافذة المنبثقة المنفصلة بـ Portal
  const modalContent = open ? (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 dir-rtl">
      {/* خلفية معتمة على كامل الشاشة */}
      <button
        type="button"
        aria-label="إغلاق الإشعارات"
        onClick={() => setOpen(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* النافذة المركزية المستقلة */}
      <div className="relative z-10 flex max-h-[80dvh] w-full max-w-sm flex-col rounded-3xl bg-card p-4 shadow-2xl transition-all border border-border">
        {/* شريط عنوان النافذة */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">الإشعارات</h2>
          </div>

          <div className="flex items-center gap-2">
            {unread > 0 ? (
              <button
                type="button"
                onClick={async () => {
                  await markAllNotificationsRead(userId);
                  await invalidate();
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <CheckCheck className="h-4 w-4" />
                تعليم الكل كمقروء
              </button>
            ) : null}
            <button
              type="button"
              aria-label="إغلاق"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-xl hover:bg-accent text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* قائمة الإشعارات */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 no-scrollbar">
          {items.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              لا توجد إشعارات بعد.
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-2xl border p-3 text-xs transition-colors ${
                    n.is_read ? "border-border/60 bg-card" : "border-primary/30 bg-primary/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground">{n.title}</p>
                      {n.body ? (
                        <p className="mt-1 text-muted-foreground leading-relaxed">{n.body}</p>
                      ) : null}
                      <p className="mt-1.5 text-[10px] text-muted-foreground/80">
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
                      className="shrink-0 text-muted-foreground hover:text-destructive p-1 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
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
                      className="mt-2 inline-block font-semibold text-primary hover:underline"
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
                      className="mt-2 font-semibold text-primary hover:underline"
                    >
                      تعليم كمقروء
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        aria-label="الإشعارات"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-accent active:scale-95"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs">
            {unread.toLocaleString("ar-EG")}
          </span>
        ) : null}
      </button>

      {/* إخراج النافذة خارج نطاق الـ Parent تماماً */}
      {mounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
                  }
