import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
} from "lucide-react";

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

    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open]);

  const {
    data: items = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      "notifications",
      userId,
    ],

    queryFn: () =>
      fetchNotifications(userId),

    enabled: Boolean(userId),

    refetchInterval: 30_000,

    staleTime: 10_000,
  });

  const unread = items.filter(
    (notification) =>
      !notification.is_read,
  ).length;

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: [
        "notifications",
        userId,
      ],
    });
  };

  const handleMarkAllRead =
    async () => {
      if (!userId || unread === 0) {
        return;
      }

      await markAllNotificationsRead(
        userId,
      );

      await invalidate();
    };

  const handleDelete = async (
    notificationId: string,
  ) => {
    await deleteNotification(
      notificationId,
    );

    await invalidate();
  };

  const handleMarkRead = async (
    notificationId: string,
  ) => {
    await markNotificationRead(
      notificationId,
    );

    await invalidate();
  };

  if (!user) {
    return (
      <Link
        to="/auth"
        aria-label="الإشعارات"
        title="الإشعارات"
        className="
          relative
          grid
          h-10
          w-10
          place-items-center
          rounded-xl
          text-foreground
          transition-all
          hover:bg-accent
          active:scale-95
        "
      >
        <Bell
          className="h-5 w-5"
          strokeWidth={2}
        />
      </Link>
    );
  }

  const modalContent = open ? (
    <div
      className="
        fixed
        inset-0
        z-[99999]
        flex
        items-end
        justify-center
        sm:items-center
        sm:p-4
      "
      dir="rtl"
    >
      {/* الخلفية */}
      <button
        type="button"
        aria-label="إغلاق الإشعارات"
        onClick={() => setOpen(false)}
        className="
          fixed
          inset-0
          cursor-default
          bg-[#071E27]/65
          backdrop-blur-[3px]
          animate-in
          fade-in
          duration-200
        "
      />

      {/* نافذة الإشعارات */}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-title"
        className="
          relative
          z-10
          flex
          max-h-[88dvh]
          w-full
          max-w-md
          flex-col
          overflow-hidden
          rounded-t-[28px]
          border
          border-border
          bg-card
          shadow-2xl
          animate-in
          slide-in-from-bottom
          duration-300
          sm:max-h-[82dvh]
          sm:rounded-3xl
          sm:slide-in-from-bottom-2
        "
      >
        {/* مؤشر السحب للجوال */}
        <div
          className="
            mx-auto
            mt-2.5
            h-1
            w-10
            rounded-full
            bg-muted-foreground/20
            sm:hidden
          "
        />

        {/* الرأس */}
        <header
          className="
            flex
            shrink-0
            items-center
            justify-between
            gap-3
            border-b
            border-border/70
            px-4
            pb-3
            pt-3
            sm:pt-4
          "
        >
          <div className="flex items-center gap-3">
            <span
              className="
                relative
                grid
                h-10
                w-10
                shrink-0
                place-items-center
                rounded-2xl
                bg-brand-soft
                text-primary
              "
            >
              <Bell
                className="h-5 w-5"
                strokeWidth={2}
              />

              {unread > 0 ? (
                <span
                  className="
                    absolute
                    -end-1
                    -top-1
                    h-2.5
                    w-2.5
                    rounded-full
                    bg-[#D65A31]
                    ring-2
                    ring-card
                  "
                />
              ) : null}
            </span>

            <div>
              <h2
                id="notifications-title"
                className="
                  text-sm
                  font-black
                  text-foreground
                "
              >
                الإشعارات
              </h2>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  font-medium
                  text-muted-foreground
                "
              >
                {unread > 0
                  ? `${unread.toLocaleString(
                      "ar-EG",
                    )} إشعار غير مقروء`
                  : "أنت على اطلاع بكل جديد"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unread > 0 ? (
              <button
                type="button"
                onClick={
                  handleMarkAllRead
                }
                className="
                  inline-flex
                  min-h-9
                  items-center
                  gap-1.5
                  rounded-xl
                  px-2.5
                  text-[10px]
                  font-black
                  text-primary
                  transition-all
                  hover:bg-brand-soft
                  active:scale-95
                "
              >
                <CheckCheck className="h-4 w-4" />
                <span>تعليم الكل كمقروء</span>
              </button>
            ) : null}

            <button
              type="button"
              aria-label="إغلاق"
              onClick={() =>
                setOpen(false)
              }
              className="
                grid
                h-9
                w-9
                place-items-center
                rounded-xl
                text-muted-foreground
                transition-all
                hover:bg-accent
                hover:text-foreground
                active:scale-95
              "
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* المحتوى */}
        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overscroll-contain
            px-3
            py-3
            no-scrollbar
          "
        >
          {isLoading ? (
            <div
              className="
                space-y-2
              "
            >
              {[1, 2, 3].map(
                (item) => (
                  <div
                    key={item}
                    className="
                      flex
                      animate-pulse
                      gap-3
                      rounded-2xl
                      border
                      border-border/60
                      p-3
                    "
                  >
                    <div
                      className="
                        h-10
                        w-10
                        shrink-0
                        rounded-xl
                        bg-secondary
                      "
                    />

                    <div className="flex-1 space-y-2">
                      <div
                        className="
                          h-3
                          w-2/3
                          rounded-full
                          bg-secondary
                        "
                      />

                      <div
                        className="
                          h-2.5
                          w-full
                          rounded-full
                          bg-secondary
                        "
                      />

                      <div
                        className="
                          h-2
                          w-1/3
                          rounded-full
                          bg-secondary
                        "
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : items.length === 0 ? (
            <div
              className="
                flex
                min-h-[320px]
                flex-col
                items-center
                justify-center
                px-6
                text-center
              "
            >
              <span
                className="
                  grid
                  h-16
                  w-16
                  place-items-center
                  rounded-[22px]
                  bg-brand-soft
                  text-primary
                "
              >
                <Bell
                  className="h-7 w-7"
                  strokeWidth={1.7}
                />
              </span>

              <h3
                className="
                  mt-5
                  text-sm
                  font-black
                  text-foreground
                "
              >
                لا توجد إشعارات
              </h3>

              <p
                className="
                  mt-2
                  max-w-[240px]
                  text-[10px]
                  leading-6
                  text-muted-foreground
                "
              >
                عندما يصل تحديث جديد
                لطلباتك أو حسابك سيظهر
                هنا تلقائياً.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(
                (notification) => {
                  const unreadItem =
                    !notification.is_read;

                  return (
                    <article
                      key={
                        notification.id
                      }
                      className={[
                        "group relative overflow-hidden rounded-2xl border p-3",
                        "transition-all",
                        unreadItem
                          ? "border-primary/20 bg-primary/[0.045]"
                          : "border-border/60 bg-card",
                      ].join(" ")}
                    >
                      {/* خط الهوية للإشعار غير المقروء */}
                      {unreadItem ? (
                        <span
                          aria-hidden="true"
                          className="
                            absolute
                            inset-y-0
                            start-0
                            w-1
                            bg-[#D65A31]
                          "
                        />
                      ) : null}

                      <div
                        className="
                          flex
                          items-start
                          gap-3
                        "
                      >
                        <span
                          className={[
                            "mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                            unreadItem
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground",
                          ].join(" ")}
                        >
                          <Bell
                            className="h-4 w-4"
                            strokeWidth={2}
                          />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className="
                                text-xs
                                font-black
                                leading-5
                                text-foreground
                              "
                            >
                              {
                                notification.title
                              }
                            </h3>

                            {unreadItem ? (
                              <span
                                className="
                                  mt-1
                                  h-1.5
                                  w-1.5
                                  shrink-0
                                  rounded-full
                                  bg-[#D65A31]
                                "
                              />
                            ) : null}
                          </div>

                          {notification.body ? (
                            <p
                              className="
                                mt-1
                                text-[10px]
                                leading-6
                                text-muted-foreground
                              "
                            >
                              {
                                notification.body
                              }
                            </p>
                          ) : null}

                          <time
                            dateTime={
                              notification.created_at
                            }
                            className="
                              mt-1.5
                              block
                              text-[8px]
                              font-medium
                              text-muted-foreground/70
                            "
                          >
                            {new Date(
                              notification.created_at,
                            ).toLocaleString(
                              "ar-EG",
                              {
                                dateStyle:
                                  "medium",
                                timeStyle:
                                  "short",
                              },
                            )}
                          </time>

                          <div
                            className="
                              mt-2
                              flex
                              flex-wrap
                              items-center
                              gap-2
                            "
                          >
                            {notification.link_url ? (
                              <Link
                                to={
                                  notification.link_url
                                }
                                onClick={async () => {
                                  if (
                                    unreadItem
                                  ) {
                                    await handleMarkRead(
                                      notification.id,
                                    );
                                  }

                                  setOpen(
                                    false,
                                  );
                                }}
                                className="
                                  inline-flex
                                  min-h-8
                                  items-center
                                  rounded-lg
                                  bg-brand-soft
                                  px-2.5
                                  text-[9px]
                                  font-black
                                  text-primary
                                  transition-all
                                  hover:bg-primary
                                  hover:text-primary-foreground
                                  active:scale-95
                                "
                              >
                                عرض التفاصيل
                              </Link>
                            ) : unreadItem ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleMarkRead(
                                    notification.id,
                                  )
                                }
                                className="
                                  inline-flex
                                  min-h-8
                                  items-center
                                  rounded-lg
                                  bg-brand-soft
                                  px-2.5
                                  text-[9px]
                                  font-black
                                  text-primary
                                  transition-all
                                  hover:bg-primary
                                  hover:text-primary-foreground
                                  active:scale-95
                                "
                              >
                                تعليم كمقروء
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <button
                          type="button"
                          aria-label="حذف الإشعار"
                          title="حذف الإشعار"
                          onClick={() =>
                            handleDelete(
                              notification.id,
                            )
                          }
                          className="
                            grid
                            h-8
                            w-8
                            shrink-0
                            place-items-center
                            rounded-lg
                            text-muted-foreground/60
                            opacity-100
                            transition-all
                            hover:bg-destructive/10
                            hover:text-destructive
                            active:scale-95
                            sm:opacity-60
                            sm:group-hover:opacity-100
                          "
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </div>

        {/* حالة التحديث */}
        {isFetching && !isLoading ? (
          <div
            className="
              shrink-0
              border-t
              border-border/50
              bg-secondary/40
              px-4
              py-2
              text-center
              text-[8px]
              font-bold
              text-muted-foreground
            "
          >
            يتم تحديث الإشعارات...
          </div>
        ) : null}

        {/* Safe Area */}
        <div className="h-[env(safe-area-inset-bottom)] bg-card" />
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        aria-label="الإشعارات"
        title="الإشعارات"
        aria-expanded={open}
        onClick={() =>
          setOpen((value) => !value)
        }
        className="
          relative
          grid
          h-10
          w-10
          shrink-0
          place-items-center
          rounded-xl
          text-foreground
          transition-all
          hover:bg-accent
          active:scale-95
        "
      >
        <Bell
          className="h-5 w-5"
          strokeWidth={2}
        />

        {unread > 0 ? (
          <>
            <span
              aria-hidden="true"
              className="
                absolute
                -end-0.5
                -top-0.5
                h-2
                w-2
                rounded-full
                bg-[#D65A31]
                ring-2
                ring-background
              "
            />

            <span
              aria-label={`${unread} إشعار غير مقروء`}
              className="
                absolute
                -end-2
                -top-2
                grid
                min-h-5
                min-w-5
                place-items-center
                rounded-full
                bg-primary
                px-1
                text-[8px]
                font-black
                text-primary-foreground
                shadow-sm
                ring-2
                ring-background
              "
            >
              {unread > 99
                ? "99+"
                : unread.toLocaleString(
                    "ar-EG",
                  )}
            </span>
          </>
        ) : null}
      </button>

      {mounted && modalContent
        ? createPortal(
            modalContent,
            document.body,
          )
        : null}
    </>
  );
}

export default NotificationBell;
