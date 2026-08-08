import { useState } from "react";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  // افترضنا قائمة الإشعارات هنا، يمكنك الإبقاء على منطق جلب البيانات الخاص بك
  const [notifications, setNotifications] = useState([
    { id: "1", title: "حالة الطلب", desc: "TSK-1010: تم التسليم", time: "9:05:24 م" },
    { id: "2", title: "حالة الطلب", desc: "TSK-1009: تم التأكيد", time: "9:49:44 م" },
  ]);

  const unreadCount = notifications.length;

  return (
    <>
      <button
        type="button"
        aria-label="الإشعارات"
        onClick={() => setOpen(true)}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-accent active:scale-95"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-accent-solid px-1 text-[10px] font-bold text-accent-solid-foreground">
            {unreadCount.toLocaleString("ar-EG")}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
          {/* الخلفية المظلمة */}
          <button
            type="button"
            aria-label="إغلاق"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* نافذة الإشعارات المتواجدة بالمنتصف */}
          <div className="relative flex max-h-[85dvh] w-full max-w-md flex-col rounded-3xl bg-card p-4 shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                الإشعارات
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="تعليم الكل كمقروء"
                  onClick={() => setNotifications([])}
                  className="flex items-center gap-1 rounded-xl px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">تعليم الكل كمقروء</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-xl hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 no-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  لا توجد إشعارات جديدة
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className="relative flex items-start justify-between gap-3 rounded-2xl border border-border/70 p-3 bg-secondary/30"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                      <span className="mt-1 block text-[10px] text-muted-foreground/70">
                        {item.time}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setNotifications((prev) => prev.filter((n) => n.id !== item.id))
                      }
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
