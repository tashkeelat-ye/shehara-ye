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
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => fetchNotifications(userId),
    enabled: Boolean(userId),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const unread = items.filter((notification) => !notification.is_read).length;

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["notifications", userId],
    });
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    await markAllNotificationsRead(userId);
    await invalidate();
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId);
    await invalidate();
  };

  const handleMarkRead = async (notificationId: string) => {
    await markNotificationRead(notificationId);
    await invalidate();
  };

  if (!user) {
    return (
      <Link
        to="/auth"
        aria-label="الإشعارات"
        className="grid h-10 w-10 place-items-center rounded-2xl text-[#0E4D64] transition hover:bg-[#0E4D64]/10 hover:text-[#D65A31] active:scale-95 dark:text-white"
      >
        <Bell className="h-5 w-5" strokeWidth={2.1} />
      </Link>
    );
  }

  const modalContent = open ? (
    <div
      dir="rtl"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="إغلاق الإشعارات"
        onClick={() => setOpen(false)}
        className="fixed inset-0 bg-[#071B24]/60 backdrop-blur-[4px] transition-opacity"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-title"
        className="relative z-10 flex max-h-[82dvh] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-[#071E28]"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3.5 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64] dark:bg-white/10 dark:text-[#8DC1CC]">
              <Bell className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <div>
              <h2
                id="notifications-title"
                className="text-sm font-black text-slate-900 dark:text-white"
              >
                الإشعارات
              </h2>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                {unread > 0 ? `${unread} إشعار غير مقروء` : "لا توجد إشعارات غير مقروءة"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unread > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-[#0E4D64] transition hover:bg-[#0E4D64]/10 dark:text-[#8DC1CC]"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>تعليم الكل</span>
              </button>
            ) : null}

            <button
              type="button"
              aria-label="إغلاق"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 no-scrollbar">
          {isLoading ? (
            <div className="flex min-h-36 items-center justify-center text-xs font-bold text-slate-400">
              جارٍ تحميل الإشعارات...
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center p-4 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5">
                <Bell className="h-6 w-6" />
              </span>
              <p className="mt-3 text-xs font-black text-slate-800 dark:text-slate-200">
                لا توجد إشعارات حالياً
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                ستظهر إشعارات طلباتك وتحديثات العروض هنا.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((notification) => (
                <li
                  key={notification.id}
                  className={`rounded-2xl border p-3 transition-colors ${
                    notification.is_read
                      ? "border-slate-100 bg-white dark:border-white/5 dark:bg-[#0A2A38]"
                      : "border-[#0E4D64]/20 bg-[#EBF2F5]/60 dark:border-[#0E4D64]/40 dark:bg-[#0E4D64]/20"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#0E4D64]/10 text-[#0E4D64] dark:bg-white/10 dark:text-[#8DC1CC]">
                      <Bell className="h-3.5 w-3.5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-900 dark:text-white">
                        {notification.title}
                      </p>
                      {notification.body ? (
                        <p className="mt-1 text-[11px] leading-5 text-slate-600 dark:text-slate-300">
                          {notification.body}
                        </p>
                      ) : null}
                      <time className="mt-1.5 block text-[9px] font-bold text-slate-400">
                        {new Date(notification.created_at).toLocaleString("ar-EG")}
                      </time>

                      {notification.link_url ? (
                        <Link
                          to={notification.link_url}
                          onClick={async () => {
                            await handleMarkRead(notification.id);
                            setOpen(false);
                          }}
                          className="mt-2 inline-flex h-7 items-center rounded-lg bg-[#0E4D64] px-2.5 text-[10px] font-bold text-white shadow-xs"
                        >
                          عرض التفاصيل
                        </Link>
                      ) : !notification.is_read ? (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(notification.id)}
                          className="mt-2 text-[10px] font-bold text-[#0E4D64] hover:underline dark:text-[#8DC1CC]"
                        >
                          تعليم كمقروء
                        </button>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      aria-label="حذف الإشعار"
                      onClick={() => handleDelete(notification.id)}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        aria-label="الإشعارات"
        aria-expanded={open}
        onClick={() => setOpen((val) => !val)}
        className="relative grid h-10 w-10 place-items-center rounded-2xl text-[#0E4D64] transition hover:bg-[#0E4D64]/10 hover:text-[#D65A31] active:scale-95 dark:text-white"
      >
        <Bell className="h-5 w-5" strokeWidth={2.1} />
        {unread > 0 ? (
          <span className="absolute end-1 top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#D65A31] px-1 text-[9px] font-black text-white shadow-sm ring-2 ring-white dark:ring-[#071E28]">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {mounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}

export default NotificationBell;
